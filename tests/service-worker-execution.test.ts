/**
 * Service Worker Execution Tests
 *
 * Purpose: Test the ACTUAL bundled service worker by executing it in a simulated SW environment
 * Context: Tests the real production bundle (dist/flows-sw.js) not source files
 * Safe to remove: No - this validates the actual service worker that ships to production
 *
 * IMPORTANT: This is the highest-fidelity test possible without a real browser
 * - Loads the actual built service worker bundle (dist/flows-sw.js)
 * - Executes the real code in a simulated service worker environment
 * - Tests the actual message handler that processes RPC calls
 * - Uses fake-indexeddb for real database operations
 *
 * This tests what actually runs in production browsers, not source files or mocks.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

// Service worker environment simulation
import makeServiceWorkerEnv from 'service-worker-mock';

// Real IndexedDB polyfill
import 'fake-indexeddb/auto';
import type { SessionData } from '../src/types/auth.js';

describe('Service Worker Bundle Execution Tests', () => {
	let swCode: string;
	let swEnv: ReturnType<typeof makeServiceWorkerEnv>;

	beforeEach(async () => {
		// Load the ACTUAL production service worker bundle
		const swPath = resolve(__dirname, '../dist/flows-sw.js');
		swCode = await readFile(swPath, 'utf-8');

		// Create simulated service worker environment
		swEnv = makeServiceWorkerEnv();

		// Install service worker environment globals BEFORE eval
		// Use defineProperty to skip read-only globals (e.g. navigator in jsdom)
		for (const [key, value] of Object.entries(swEnv)) {
			try {
				(globalThis as Record<string, unknown>)[key] = value;
			} catch {
				// skip read-only properties (e.g. navigator in jsdom)
			}
		}

		// Ensure self is available globally (service workers use 'self' instead of 'window')
		(globalThis as Record<string, unknown>).self = swEnv.self || swEnv;

		// Add fake-indexeddb to the global scope (already imported)
		// The service worker code will use the real IndexedDB polyfill

		// Execute the service worker code
		// This runs all the addEventListener calls and initialization logic
		try {
			eval(swCode);
		} catch (error) {
			console.error('Error executing service worker:', error);
			throw error;
		}

		// Trigger install event
		await swEnv.trigger('install');

		// Trigger activate event
		await swEnv.trigger('activate');
	});

	afterEach(() => {
		// Don't delete self: async SW callbacks (IndexedDB seeding) fire post-test; beforeEach overwrites it each run.
		const g = globalThis as Record<string, unknown>;
		delete g.caches;
		delete g.clients;
	});

	describe('RPC Message Handler - Auth Operations', () => {
		it('should handle auth/saveSession RPC call', async () => {
			const session: SessionData = {
				userId: 'test-user-123',
				email: 'test@example.com',
				name: 'Test User',
				emailVerified: true,
				metadata: {},
				accessToken: 'test_access_token',
				refreshToken: 'test_refresh_token',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				refreshedAt: new Date().toISOString(),
				authMethod: 'email-code',
			};

			// Create a message event simulating client communication
			const messageEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'auth',
					method: 'saveSession',
					input: session,
				},
				ports: [
					{
						postMessage: (response: any) => {
							// Verify the response
							expect(response.success).toBe(true);
							expect(response.result).toBeUndefined(); // saveSession returns void
						},
					},
				],
			});

			// Trigger the message handler in the service worker
			await swEnv.trigger('message', messageEvent);
		});

		it('should handle auth/getSession RPC call and return saved session', async () => {
			// First, save a session
			const session: SessionData = {
				userId: 'test-user-456',
				email: 'retrieve@example.com',
				accessToken: 'retrieve_token',
				refreshToken: 'retrieve_refresh',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				refreshedAt: new Date().toISOString(),
				authMethod: 'email-code',
			};

			const saveEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'auth',
					method: 'saveSession',
					input: session,
				},
				ports: [{ postMessage: () => {} }],
			});

			await swEnv.trigger('message', saveEvent);

			// Now retrieve it
			const getEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'auth',
					method: 'getSession',
					input: null,
				},
				ports: [
					{
						postMessage: (response: any) => {
							expect(response.success).toBe(true);
							expect(response.result).not.toBeNull();
							expect(response.result.userId).toBe('test-user-456');
							expect(response.result.email).toBe('retrieve@example.com');
							expect(response.result.refreshToken).toBe('retrieve_refresh');
						},
					},
				],
			});

			await swEnv.trigger('message', getEvent);
		});

		it('should return expired sessions (critical bug fix)', async () => {
			// Save an expired session
			const expiredSession: SessionData = {
				userId: 'expired-user',
				email: 'expired@example.com',
				accessToken: 'expired_token',
				refreshToken: 'valid_refresh_token',
				expiresAt: new Date(Date.now() - 3600000).toISOString(), // Expired 1 hour ago
				refreshedAt: new Date(Date.now() - 3600000).toISOString(),
				authMethod: 'email-code',
			};

			const saveEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'auth',
					method: 'saveSession',
					input: expiredSession,
				},
				ports: [{ postMessage: () => {} }],
			});

			await swEnv.trigger('message', saveEvent);

			// Retrieve - should return expired session for token refresh
			const getEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'auth',
					method: 'getSession',
					input: null,
				},
				ports: [
					{
						postMessage: (response: any) => {
							// CRITICAL: Must return expired session
							expect(response.success).toBe(true);
							expect(response.result).not.toBeNull();
							expect(response.result.refreshToken).toBe('valid_refresh_token');
							expect(new Date(response.result.expiresAt).getTime()).toBeLessThan(Date.now());
						},
					},
				],
			});

			await swEnv.trigger('message', getEvent);
		});

		it('should persist refreshedAt field (spam protection)', async () => {
			const session: SessionData = {
				userId: 'spam-test-user',
				email: 'spam@example.com',
				accessToken: 'spam_token',
				refreshToken: 'spam_refresh',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				refreshedAt: new Date(Date.now() - 30000).toISOString(), // Refreshed 30 seconds ago
				authMethod: 'email-code',
			};

			const saveEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'auth',
					method: 'saveSession',
					input: session,
				},
				ports: [{ postMessage: () => {} }],
			});

			await swEnv.trigger('message', saveEvent);

			const getEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'auth',
					method: 'getSession',
					input: null,
				},
				ports: [
					{
						postMessage: (response: any) => {
							expect(response.success).toBe(true);
							expect(response.result.refreshedAt).toBeDefined();
							const timeSinceRefresh = Date.now() - new Date(response.result.refreshedAt).getTime();
							expect(timeSinceRefresh).toBeGreaterThanOrEqual(30000);
						},
					},
				],
			});

			await swEnv.trigger('message', getEvent);
		});

		it('should clear auth sessions', async () => {
			// Save a session
			const session: SessionData = {
				userId: 'clear-user',
				email: 'clear@example.com',
				accessToken: 'clear_token',
				refreshToken: 'clear_refresh',
				expiresAt: new Date(Date.now() + 3600000).toISOString(),
				refreshedAt: new Date().toISOString(),
				authMethod: 'email-code',
			};

			const saveEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'auth',
					method: 'saveSession',
					input: session,
				},
				ports: [{ postMessage: () => {} }],
			});

			await swEnv.trigger('message', saveEvent);

			// Clear it
			const clearEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'auth',
					method: 'clearSession',
					input: null,
				},
				ports: [{ postMessage: () => {} }],
			});

			await swEnv.trigger('message', clearEvent);

			// Verify it's gone
			const getEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'auth',
					method: 'getSession',
					input: null,
				},
				ports: [
					{
						postMessage: (response: any) => {
							expect(response.success).toBe(true);
							expect(response.result).toBeNull();
						},
					},
				],
			});

			await swEnv.trigger('message', getEvent);
		});
	});

	describe('RPC Message Handler - Query Operations', () => {
		it('should handle query/journeys RPC call', async () => {
			const messageEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'query',
					method: 'journeys',
					input: {},
				},
				ports: [
					{
						postMessage: (response: any) => {
							expect(response.success).toBe(true);
							expect(response.result).toBeDefined();
							expect(Array.isArray(response.result)).toBe(true);
							// Should have seed data
							expect(response.result.length).toBeGreaterThan(0);
						},
					},
				],
			});

			await swEnv.trigger('message', messageEvent);
		});

		it('should handle query/tasks RPC call', async () => {
			const messageEvent = new swEnv.ExtendableMessageEvent('message', {
				data: {
					type: 'RPC',
					procedure: 'query',
					method: 'tasks',
					input: {},
				},
				ports: [
					{
						postMessage: (response: any) => {
							expect(response.success).toBe(true);
							expect(response.result).toBeDefined();
							expect(Array.isArray(response.result)).toBe(true);
							// Should have seed data
							expect(response.result.length).toBeGreaterThan(0);
						},
					},
				],
			});

			await swEnv.trigger('message', messageEvent);
		});
	});

	describe('Service Worker Lifecycle', () => {
		it('should successfully load and execute the service worker bundle', () => {
			// If we got this far, the service worker bundle loaded and executed successfully
			// The beforeEach runs eval(swCode) and triggers install/activate events
			expect(swCode).toBeDefined();
			expect(swCode.length).toBeGreaterThan(1000);
		});

		it('should register event listeners in the bundle', () => {
			// Verify the bundle contains the expected event listener registrations
			expect(swCode).toContain('addEventListener');
			expect(swCode).toContain('"message"');
			expect(swCode).toContain('"install"');
			expect(swCode).toContain('"activate"');
		});
	});

	describe('Bundle Content Validation', () => {
		it('should contain seed data in bundle', () => {
			// Verify the bundle has been built correctly
			expect(swCode).toContain('journey-001');
			expect(swCode).toContain('Sarah Chen');
			expect(swCode).toContain('task-001');
		});

		it('should contain IndexedDB operations', () => {
			expect(swCode).toContain('indexedDB');
			expect(swCode).toContain('createObjectStore');
		});

		it('should contain RPC handler switch statements', () => {
			// The bundled code should have case statements for different procedures
			expect(swCode).toContain('case "journeys"');
			expect(swCode).toContain('case "tasks"');
		});
	});
});
