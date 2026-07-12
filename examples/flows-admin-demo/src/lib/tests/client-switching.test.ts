/**
 * Client Switching Regression Tests
 *
 * These tests ensure that client switching functionality works correctly
 * and prevents regressions like the ones encountered where:
 * 1. Client selections don't persist across navigation
 * 2. loadDemoData() overrides user selections
 * 3. Store synchronization issues between legacy and new systems
 */

import { waitFor } from '@testing-library/svelte';
import { get } from 'svelte/store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Test utilities
import { cleanupTestEnvironment, setupTestEnvironment } from './test-utils';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

// Mock Supabase
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
};

describe('Client Switching Regression Tests', () => {
  beforeEach(async () => {
    // Setup test environment
    setupTestEnvironment();

    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true,
    });

    // Mock Supabase
    vi.doMock('../supabase', () => ({
      supabase: mockSupabase,
    }));

    // Reset all mocks
    vi.clearAllMocks();
    mockLocalStorage.clear();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('localStorage Persistence', () => {
    it('should persist client selection in localStorage', async () => {
      const testClientId = 'test-client-123';

      // Switch to a client
      await demoClientSwitcher.switchDemoClient(testClientId);

      // Verify localStorage was updated
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('selectedClientId', testClientId);
    });

    it('should respect stored client selection on loadDemoData', async () => {
      const storedClientId = 'hygge-hvidlog';
      const mockClient = {
        id: '1',
        client_id: storedClientId,
        client_code: storedClientId,
        legal_name: 'Hygge & Hvidløg ApS',
        industry: 'Food & Beverage',
      };

      // Mock localStorage to return stored client
      mockLocalStorage.getItem.mockReturnValue(storedClientId);

      // Mock Supabase to return the stored client
      mockSupabase.single.mockResolvedValue({
        data: mockClient,
        error: null,
      });

      // Load demo data
      await loadDemoData();

      // Verify Supabase was queried for the stored client
      expect(mockSupabase.eq).toHaveBeenCalledWith('client_id', storedClientId);
    });

    it('should not override stored selection with default priority', async () => {
      const storedClientId = 'meridian-brands';
      const mockClient = {
        id: '2',
        client_id: storedClientId,
        client_code: storedClientId,
        legal_name: 'Meridian Brands International',
      };

      // Mock localStorage to return stored client (not the default hygge-hvidlog)
      mockLocalStorage.getItem.mockReturnValue(storedClientId);

      // Mock Supabase to return the stored client
      mockSupabase.single.mockResolvedValue({
        data: mockClient,
        error: null,
      });

      await loadDemoData();

      // Should query for stored client, not fall through to priority list
      expect(mockSupabase.eq).toHaveBeenCalledWith('client_id', storedClientId);
      expect(mockSupabase.eq).not.toHaveBeenCalledWith('client_code', 'hygge-hvidlog');
    });

    it('should clear invalid stored selections', async () => {
      const invalidClientId = 'nonexistent-client';

      // Mock localStorage to return invalid client
      mockLocalStorage.getItem.mockReturnValue(invalidClientId);

      // Mock Supabase to return error for invalid client
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Client not found' },
      });

      // Mock fallback to priority client
      mockSupabase.eq.mockImplementation((field, value) => {
        if (field === 'client_code' && value === 'hygge-hvidlog') {
          return {
            ...mockSupabase,
            single: vi.fn().mockResolvedValue({
              data: { id: '1', client_code: 'hygge-hvidlog' },
              error: null,
            }),
          };
        }
        return mockSupabase;
      });

      await loadDemoData();

      // Should clear invalid selection
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('selectedClientId');
    });
  });

  describe('Store Synchronization', () => {
    it('should synchronize new domain store changes with legacy store', async () => {
      const testClient = {
        client_id: 'test-client',
        client_code: 'test-client',
        legal_name: 'Test Client Corp',
        industry: 'Technology',
        domain: 'test.com',
        tier: 'pro',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Update domain store
      await clientStore.setCurrentClient(testClient);

      // Wait for store bridge to synchronize
      await waitFor(() => {
        const legacyClient = get(client);
        expect(legacyClient).toBeTruthy();
        expect(legacyClient?.client_id).toBe(testClient.client_id);
      });
    });

    it('should not create infinite update loops between stores', async () => {
      const testClient = {
        client_id: 'test-client',
        client_code: 'test-client',
        legal_name: 'Test Client Corp',
        industry: 'Technology',
        domain: 'test.com',
        tier: 'pro',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Track number of calls to prevent infinite loops
      const setSpy = vi.spyOn(client, 'set');

      // Update domain store
      await clientStore.setCurrentClient(testClient);

      // Wait a bit to see if there are excessive calls
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should only be called once (no infinite loop)
      expect(setSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Demo Client Switcher Integration', () => {
    it('should coordinate data loading across all domains', async () => {
      const testClientId = 'test-client-123';

      // Mock the switcher methods
      const switchContextSpy = vi.spyOn(demoClientSwitcher, 'switchClientContext');
      const loadTFCSpy = vi.spyOn(demoClientSwitcher, 'loadTFCData');
      const loadPeopleSpy = vi.spyOn(demoClientSwitcher, 'loadPeopleData');

      await demoClientSwitcher.switchDemoClient(testClientId);

      // Verify all domains are updated
      expect(switchContextSpy).toHaveBeenCalledWith(testClientId);
      expect(loadTFCSpy).toHaveBeenCalledWith(testClientId);
      expect(loadPeopleSpy).toHaveBeenCalledWith(testClientId);
    });

    it('should handle errors gracefully during switching', async () => {
      const testClientId = 'failing-client';

      // Mock one of the data loading methods to fail
      vi.spyOn(demoClientSwitcher, 'loadTFCData').mockRejectedValue(new Error('TFC load failed'));

      // Should not throw, but handle error
      await expect(demoClientSwitcher.switchDemoClient(testClientId)).rejects.toThrow(
        'TFC load failed'
      );

      // Should still attempt to load other data
      const loadPeopleSpy = vi.spyOn(demoClientSwitcher, 'loadPeopleData');

      try {
        await demoClientSwitcher.switchDemoClient(testClientId);
      } catch (_e) {
        // Expected to fail
      }

      // Other operations should still be attempted
      expect(loadPeopleSpy).toHaveBeenCalled();
    });
  });

  describe('Navigation Persistence', () => {
    it('should maintain client selection after navigation', async () => {
      const selectedClientId = 'meridian-brands';

      // Simulate user selecting a client
      await demoClientSwitcher.switchDemoClient(selectedClientId);

      // Verify localStorage was set
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('selectedClientId', selectedClientId);

      // Simulate page navigation (loadDemoData called again)
      mockLocalStorage.getItem.mockReturnValue(selectedClientId);
      mockSupabase.single.mockResolvedValue({
        data: { id: '2', client_id: selectedClientId, client_code: selectedClientId },
        error: null,
      });

      await loadDemoData();

      // Should load the stored client, not default to hygge-hvidlog
      expect(mockSupabase.eq).toHaveBeenCalledWith('client_id', selectedClientId);
    });

    it('should prevent default client override of user selection', async () => {
      const userSelectedClient = 'nets-demo';

      // User selects a client
      mockLocalStorage.getItem.mockReturnValue(userSelectedClient);
      mockSupabase.single.mockResolvedValue({
        data: { id: '3', client_id: userSelectedClient, client_code: userSelectedClient },
        error: null,
      });

      await loadDemoData();

      // Should NOT query for hygge-hvidlog (the default)
      expect(mockSupabase.eq).not.toHaveBeenCalledWith('client_code', 'hygge-hvidlog');

      // Should query for user's selection
      expect(mockSupabase.eq).toHaveBeenCalledWith('client_id', userSelectedClient);
    });
  });

  describe('UI Component Integration', () => {
    it('should update floating status button dropdown when client changes', async () => {
      // This would require importing and testing the actual Svelte component
      // For now, we test the underlying functionality
      const testClient = {
        client_id: 'test-client',
        client_code: 'test-client',
        legal_name: 'Test Client Corp',
        industry: 'Technology',
        domain: 'test.com',
        tier: 'pro',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await clientStore.setCurrentClient(testClient);

      const currentClient = get(clientStore.currentClient);
      expect(currentClient?.client_id).toBe(testClient.client_id);
      expect(currentClient?.legal_name).toBe(testClient.legal_name);
    });
  });

  describe('Regression Prevention', () => {
    it('should not reset to default client on every page load', async () => {
      // This test specifically prevents the bug where loadDemoData
      // always reset to hygge-hvidlog regardless of user selection

      const userClient = 'meridian-brands';
      mockLocalStorage.getItem.mockReturnValue(userClient);

      // First call - user has selected a client
      mockSupabase.single.mockResolvedValue({
        data: { id: '2', client_id: userClient, client_code: userClient },
        error: null,
      });

      await loadDemoData();

      // Reset mocks
      vi.clearAllMocks();

      // Second call - simulate page navigation
      mockLocalStorage.getItem.mockReturnValue(userClient);
      mockSupabase.single.mockResolvedValue({
        data: { id: '2', client_id: userClient, client_code: userClient },
        error: null,
      });

      await loadDemoData();

      // Should still query for user's client, not defaults
      expect(mockSupabase.eq).toHaveBeenCalledWith('client_id', userClient);
      expect(mockSupabase.eq).not.toHaveBeenCalledWith('client_code', 'hygge-hvidlog');
    });

    it('should handle edge case where localStorage contains malformed data', async () => {
      // Test edge case that could cause similar issues
      mockLocalStorage.getItem.mockReturnValue('{"malformed": json}');

      // Should not crash and should fall back to priority list
      await expect(loadDemoData()).resolves.not.toThrow();

      // Should clear the malformed data
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('selectedClientId');
    });
  });
});
