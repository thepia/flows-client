/**
 * Service Worker Integration Tests
 *
 * Purpose: Test actual service worker functions against real IndexedDB
 * Context: Integration tests using real IndexedDB (via fake-indexeddb polyfill)
 * Safe to remove: No - critical for preventing session restoration bugs
 *
 * IMPORTANT: Following thepia.com testing policy - NO MOCKING of core functionality
 * - Uses real IndexedDB implementation (polyfilled for Node.js)
 * - Tests actual service worker functions, not copies
 * - Validates real behavior, not mock behavior
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Import real IndexedDB polyfill for Node.js environment
import 'fake-indexeddb/auto';

// Import ACTUAL service worker functions (not mocks!)
import {
	clearAuthSession,
	getAuthSession,
	initDB,
	saveAuthSession,
} from '../src/service-worker/index-db.js';
import { SEED_JOURNEYS, SEED_TASKS } from '../src/service-worker/seed.js';
import type { SessionData } from '../src/types/auth.js';

describe('Service Worker Seed Data', () => {
	it('should have valid journey seed data', () => {
		expect(SEED_JOURNEYS).toHaveLength(3);
		expect(SEED_JOURNEYS[0]).toHaveProperty('id');
		expect(SEED_JOURNEYS[0]).toHaveProperty('title');
		expect(SEED_JOURNEYS[0]).toHaveProperty('status');
		expect(SEED_JOURNEYS[0].id).toBe('journey-001');
		expect(SEED_JOURNEYS[0].title).toContain('Sarah Chen');
	});

	it('should have valid task seed data', () => {
		expect(SEED_TASKS).toHaveLength(6);
		expect(SEED_TASKS[0]).toHaveProperty('id');
		expect(SEED_TASKS[0]).toHaveProperty('journey_id');
		expect(SEED_TASKS[0]).toHaveProperty('title');
		expect(SEED_TASKS[0].journey_id).toBe('journey-001');
	});

	it('should have tasks linked to journeys', () => {
		const journeyIds = SEED_JOURNEYS.map((j) => j.id);
		const taskJourneyIds = SEED_TASKS.map((t) => t.journey_id);

		// All task journey_ids should exist in journeys
		for (const id of taskJourneyIds) {
			expect(journeyIds).toContain(id);
		}
	});
});

describe('Service Worker IndexedDB Real Integration', () => {
	beforeEach(async () => {
		// Initialize real IndexedDB (polyfilled by fake-indexeddb)
		await initDB();
	});

	afterEach(async () => {
		// Clean up: clear all sessions after each test
		await clearAuthSession();
	});

	describe('Auth Session Storage and Retrieval', () => {
		it('should save and retrieve a valid session', async () => {
			const session: SessionData = {
				userId: 'user-123',
				email: 'test@example.com',
				name: 'Test User',
				emailVerified: true,
				metadata: { provider: 'workos' },
				accessToken: 'valid_access_token',
				refreshToken: 'valid_refresh_token',
				expiresAt: new Date(Date.now() + 3600000).toISOString(), // Expires in 1 hour
				refreshedAt: new Date().toISOString(),
				authMethod: 'email-code',
			};

			// Save using real function
			await saveAuthSession(session);

			// Retrieve using real function
			const retrieved = await getAuthSession();

			// Verify real behavior
			expect(retrieved).not.toBeNull();
			expect(retrieved?.userId).toBe('user-123');
			expect(retrieved?.email).toBe('test@example.com');
			expect(retrieved?.accessToken).toBe('valid_access_token');
			expect(retrieved?.refreshToken).toBe('valid_refresh_token');
			expect(retrieved?.refreshedAt).toBeDefined();
		});

		it('should return expired session with refresh token (NOT filter it out)', async () => {
			// This is the CRITICAL bug fix test - service worker must return expired sessions
			// so that auth store can attempt token refresh on page load
			const expiredSession: SessionData = {
				userId: 'user-456',
				email: 'expired@example.com',
				accessToken: 'expired_token',
				refreshToken: 'valid_refresh_token',
				expiresAt: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
				refreshedAt: new Date(Date.now() - 3600000).toISOString(),
				authMethod: 'email-code',
			};

			// Save expired session using real function
			await saveAuthSession(expiredSession);

			// Retrieve using real function
			const retrieved = await getAuthSession();

			// CRITICAL: Should return the expired session, NOT null
			// This allows auth store to attempt token refresh
			expect(retrieved).not.toBeNull();
			expect(retrieved?.userId).toBe('user-456');
			expect(retrieved?.refreshToken).toBe('valid_refresh_token');
			expect(new Date(retrieved!.expiresAt).getTime()).toBeLessThan(Date.now());

			// Verify it's actually expired
			const isExpired = new Date(retrieved!.expiresAt).getTime() <= Date.now();
			expect(isExpired).toBe(true);
		});

		it('should return null when no sessions exist', async () => {
			// Don't save any session - just query empty DB
			const result = await getAuthSession();

			expect(result).toBeNull();
		});

		it('should return most recent session when multiple exist', async () => {
			const oldSession: SessionData = {
				userId: 'user-old',
				email: 'old@example.com',
				accessToken: 'old_token',
				refreshToken: 'old_refresh',
				expiresAt: new Date(Date.now() + 1800000).toISOString(),
				refreshedAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
				authMethod: 'email-code',
			};

			const recentSession: SessionData = {
				userId: 'user-recent',
				email: 'recent@example.com',
				accessToken: 'recent_token',
				refreshToken: 'recent_refresh',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				refreshedAt: new Date(Date.now() - 30000).toISOString(), // 30 seconds ago
				authMethod: 'email-code',
			};

			// Save both sessions
			await saveAuthSession(oldSession);
			// Add slight delay to ensure different savedAt timestamps
			await new Promise((resolve) => setTimeout(resolve, 10));
			await saveAuthSession(recentSession);

			// Retrieve - should get most recent by savedAt
			const retrieved = await getAuthSession();

			expect(retrieved).not.toBeNull();
			expect(retrieved?.userId).toBe('user-recent');
			expect(retrieved?.email).toBe('recent@example.com');
		});

		it('should persist refreshedAt field to prevent spam refreshes', async () => {
			const sessionWithRefreshedAt: SessionData = {
				userId: 'user-789',
				email: 'refresh-test@example.com',
				accessToken: 'access_token_abc',
				refreshToken: 'refresh_token_xyz',
				expiresAt: new Date(Date.now() + 3600000).toISOString(), // Expires in 1 hour
				refreshedAt: new Date(Date.now() - 30000).toISOString(), // Refreshed 30 seconds ago
				authMethod: 'email-code',
			};

			// Save using real function
			await saveAuthSession(sessionWithRefreshedAt);

			// Retrieve using real function
			const retrieved = await getAuthSession();

			// Verify refreshedAt is preserved
			expect(retrieved).not.toBeNull();
			expect(retrieved?.refreshedAt).toBeDefined();

			// Verify timing makes sense for spam protection
			const timeSinceRefresh = Date.now() - new Date(retrieved!.refreshedAt).getTime();
			expect(timeSinceRefresh).toBeGreaterThanOrEqual(30000);
			expect(timeSinceRefresh).toBeLessThan(60000); // Less than 1 minute
		});

		it('should handle sessions without refreshedAt (legacy data compatibility)', async () => {
			// Simulate old session data that might not have refreshedAt field
			// Use type assertion to bypass TypeScript check for legacy data simulation
			const legacySession = {
				userId: 'user-legacy',
				email: 'legacy@example.com',
				accessToken: 'legacy_token',
				refreshToken: 'legacy_refresh',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				authMethod: 'email-code',
				// No refreshedAt field
			} as SessionData;

			// Save using real function
			await saveAuthSession(legacySession);

			// Retrieve using real function
			const retrieved = await getAuthSession();

			// Should return session even without refreshedAt
			expect(retrieved).not.toBeNull();
			expect(retrieved?.userId).toBe('user-legacy');
			expect(retrieved?.accessToken).toBe('legacy_token');

			// refreshedAt may be undefined for legacy sessions
			// Auth store should handle this gracefully (treat as "never refreshed")
		});

		it('should clear sessions completely', async () => {
			const session: SessionData = {
				userId: 'user-clear',
				email: 'clear@example.com',
				accessToken: 'clear_token',
				refreshToken: 'clear_refresh',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				refreshedAt: new Date().toISOString(),
				authMethod: 'email-code',
			};

			// Save a session
			await saveAuthSession(session);

			// Verify it exists
			let retrieved = await getAuthSession();
			expect(retrieved).not.toBeNull();

			// Clear all sessions
			await clearAuthSession();

			// Verify it's gone
			retrieved = await getAuthSession();
			expect(retrieved).toBeNull();
		});

		it('should handle production regression case: expired session with valid refresh token', async () => {
			// This test reproduces the actual production bug scenario:
			// User session expires while page is open, then page is refreshed
			// Service worker MUST return the expired session so token refresh can happen

			const productionScenarioSession: SessionData = {
				userId: 'workos|user_01K4DDYMKSK82XKFYAKBG54AH9',
				email: 'henrik@thepia.com',
				accessToken: 'eyJhbGc...', // Expired access token
				refreshToken: 'ehD1doEiLCSWi0Nzp7m6DWD6Z', // Valid refresh token
				expiresAt: new Date(Date.now() - 13000000).toISOString(), // Expired ~3.6 hours ago
				refreshedAt: new Date(Date.now() - 13000000).toISOString(),
				authMethod: 'email-code',
			};

			// Save the expired session
			await saveAuthSession(productionScenarioSession);

			// Simulate page reload - retrieve session
			const retrieved = await getAuthSession();

			// BUG FIX VERIFICATION: Must return expired session for token refresh attempt
			expect(retrieved).not.toBeNull();
			expect(retrieved?.userId).toBe('workos|user_01K4DDYMKSK82XKFYAKBG54AH9');
			expect(retrieved?.refreshToken).toBe('ehD1doEiLCSWi0Nzp7m6DWD6Z');
			expect(new Date(retrieved!.expiresAt).getTime()).toBeLessThan(Date.now());

			// Verify it's actually expired by several hours
			const hoursExpired = (Date.now() - new Date(retrieved!.expiresAt).getTime()) / (1000 * 60 * 60);
			expect(hoursExpired).toBeGreaterThan(3);
		});
	});

	describe('Auth Session Update Behavior', () => {
		it('should update existing session when saving with same userId', async () => {
			const initialSession: SessionData = {
				userId: 'user-update',
				email: 'update@example.com',
				accessToken: 'initial_token',
				refreshToken: 'initial_refresh',
				expiresAt: new Date(Date.now() + 1800000).toISOString(),
				refreshedAt: new Date().toISOString(),
				authMethod: 'email-code',
			};

			// Save initial session
			await saveAuthSession(initialSession);

			// Verify initial state
			let retrieved = await getAuthSession();
			expect(retrieved?.accessToken).toBe('initial_token');
			expect(retrieved?.refreshToken).toBe('initial_refresh');

			// Update with new tokens (simulating token refresh)
			const updatedSession: SessionData = {
				userId: 'user-update', // Same user
				email: 'update@example.com',
				accessToken: 'refreshed_token',
				refreshToken: 'refreshed_refresh',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				refreshedAt: new Date().toISOString(),
				authMethod: 'email-code',
			};

			await saveAuthSession(updatedSession);

			// Verify update worked
			retrieved = await getAuthSession();
			expect(retrieved?.accessToken).toBe('refreshed_token');
			expect(retrieved?.refreshToken).toBe('refreshed_refresh');
		});

		it('should track refreshedAt timestamp updates during token refresh', async () => {
			const firstRefreshTime = Date.now() - 120000; // 2 minutes ago

			const initialSession: SessionData = {
				userId: 'user-refresh-tracking',
				email: 'refresh-tracking@example.com',
				accessToken: 'token_v1',
				refreshToken: 'refresh_v1',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				refreshedAt: new Date(firstRefreshTime).toISOString(),
				authMethod: 'email-code',
			};

			await saveAuthSession(initialSession);

			// Simulate token refresh after some time
			await new Promise((resolve) => setTimeout(resolve, 50));

			const secondRefreshTime = Date.now();
			const refreshedSession: SessionData = {
				userId: 'user-refresh-tracking',
				email: 'refresh-tracking@example.com',
				accessToken: 'token_v2',
				refreshToken: 'refresh_v2',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				refreshedAt: new Date(secondRefreshTime).toISOString(),
				authMethod: 'email-code',
			};

			await saveAuthSession(refreshedSession);

			// Verify refreshedAt was updated
			const retrieved = await getAuthSession();
			expect(new Date(retrieved!.refreshedAt).getTime()).toBeGreaterThan(firstRefreshTime);
			expect(new Date(retrieved!.refreshedAt).getTime()).toBeGreaterThanOrEqual(secondRefreshTime);
		});
	});
});
