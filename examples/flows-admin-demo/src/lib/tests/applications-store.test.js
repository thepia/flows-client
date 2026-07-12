/**
 * Applications Store Test
 * Test to understand and verify applications store behavior
 */

import { get } from 'svelte/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { applications } from '$lib/stores/data';

describe('Applications Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    applications.set([]);
  });

  it('should initialize as empty array', () => {
    const value = get(applications);
    expect(Array.isArray(value)).toBe(true);
    expect(value).toHaveLength(0);
  });

  it('should allow setting applications', () => {
    const testApps = [
      {
        id: 'test-1',
        clientId: 'client-1',
        name: 'Test App',
        code: 'test',
        type: 'onboarding',
        status: 'active',
        version: '1.0.0',
        description: 'Test application',
        features: [],
        configuration: {},
        permissions: {},
        maxConcurrentUsers: 10,
        lastAccessed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];

    applications.set(testApps);
    const value = get(applications);

    expect(value).toHaveLength(1);
    expect(value[0].code).toBe('test');
    expect(value[0].name).toBe('Test App');
  });

  it('should trigger subscriptions when updated', () => {
    const mockCallback = vi.fn();
    const unsubscribe = applications.subscribe(mockCallback);

    // Initial call
    expect(mockCallback).toHaveBeenCalledWith([]);

    // Update store
    const testApps = [{ id: 'test', code: 'test', name: 'Test' }];
    applications.set(testApps);

    expect(mockCallback).toHaveBeenCalledWith(testApps);
    expect(mockCallback).toHaveBeenCalledTimes(2);

    unsubscribe();
  });

  it('should handle reactive statements correctly', () => {
    let reactiveValue = null;
    let reactiveCallCount = 0;

    // Simulate reactive statement
    const unsubscribe = applications.subscribe((value) => {
      reactiveValue = value;
      reactiveCallCount++;
    });

    expect(reactiveCallCount).toBe(1);
    expect(reactiveValue).toEqual([]);

    // Update store
    const testApps = [{ id: 'test', code: 'test' }];
    applications.set(testApps);

    expect(reactiveCallCount).toBe(2);
    expect(reactiveValue).toEqual(testApps);

    unsubscribe();
  });

  it('should maintain referential integrity', () => {
    const testApps = [{ id: 'test', code: 'test' }];
    applications.set(testApps);

    const value1 = get(applications);
    const value2 = get(applications);

    // Should be the same reference
    expect(value1).toBe(value2);
    expect(value1[0]).toBe(value2[0]);
  });
});

/**
 * Integration test for reactive statement behavior
 */
describe('Applications Store Reactive Behavior', () => {
  it('should show current store state', () => {
    const currentValue = get(applications);
    console.log('🔍 Current applications store value:', currentValue);
    console.log('🔍 Type:', typeof currentValue);
    console.log('🔍 Is Array:', Array.isArray(currentValue));
    console.log('🔍 Length:', currentValue?.length);

    // Let's see what's actually in the store
    expect(Array.isArray(currentValue)).toBe(true);
  });

  it('should work with Svelte reactive statements', () => {
    // Reset store first
    applications.set([]);

    let reactiveApps = null;
    let reactiveLength = 0;
    let reactiveCallCount = 0;

    // Simulate a Svelte reactive statement: $: { ... }
    const unsubscribe = applications.subscribe((apps) => {
      console.log('🔄 Store subscription triggered with:', apps);
      reactiveApps = apps;
      reactiveLength = apps?.length || 0;
      reactiveCallCount++;
    });

    // Initial state
    console.log('📊 Initial reactive state:', { reactiveApps, reactiveLength, reactiveCallCount });
    expect(reactiveApps).toEqual([]);
    expect(reactiveLength).toBe(0);
    expect(reactiveCallCount).toBe(1);

    // Add applications
    const testApps = [
      { id: 'app1', code: 'onboarding', name: 'Onboarding' },
      { id: 'app2', code: 'offboarding', name: 'Offboarding' },
    ];

    applications.set(testApps);

    expect(reactiveApps).toEqual(testApps);
    expect(reactiveLength).toBe(2);
    expect(reactiveCallCount).toBe(2);

    unsubscribe();
  });
});
