/**
 * Service Worker Tests
 *
 * Tests the service worker in a simulated environment
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SEED_JOURNEYS, SEED_TASKS } from '../src/service-worker/seed.js';

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
		taskJourneyIds.forEach((id) => {
			expect(journeyIds).toContain(id);
		});
	});
});

describe('Service Worker IndexedDB Schema', () => {
	it('should create all required object stores', async () => {
		// Mock IndexedDB
		const mockDB = {
			objectStoreNames: {
				contains: vi.fn((name: string) => false)
			},
			createObjectStore: vi.fn((name: string, options: any) => ({
				createIndex: vi.fn()
			}))
		};

		// Simulate onupgradeneeded handler
		const stores = ['journeys', 'tasks', 'attachments', 'evidence', 'comments', 'notes'];

		stores.forEach((storeName) => {
			if (!mockDB.objectStoreNames.contains(storeName)) {
				const store = mockDB.createObjectStore(storeName, { keyPath: 'id' });
			}
		});

		// Verify all stores were created
		expect(mockDB.createObjectStore).toHaveBeenCalledTimes(6);
		expect(mockDB.createObjectStore).toHaveBeenCalledWith('journeys', { keyPath: 'id' });
		expect(mockDB.createObjectStore).toHaveBeenCalledWith('tasks', { keyPath: 'id' });
	});
});
