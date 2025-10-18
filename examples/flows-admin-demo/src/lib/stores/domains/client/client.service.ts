import { reportSupabaseError } from '$lib/config/errorReporting';
import { supabaseClientStore } from '$lib/contexts/supabase-context';
import { get } from 'svelte/store';
import type { Client } from './client.types';

// Get current Supabase client from store
function getCurrentSupabaseClient() {
  const client = get(supabaseClientStore);
  if (!client) {
    throw new Error('Authentication required - please sign in to access client data');
  }
  return client;
}

export class ClientService {
  /**
   * Load all available clients (with transparent mock data fallback)
   */
  async loadAllClients(): Promise<Client[]> {
    try {
      const supabase = getCurrentSupabaseClient();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('status', 'active')
        .order('legal_name');

      if (error) {
        await reportSupabaseError('clients', 'select', error, {
          operation: 'loadAllClients',
        });

        // In demo/development mode, provide mock data as fallback
        if (this.shouldUseMockData()) {
          console.warn('Database error, falling back to mock client data');
          return this.getMockClients();
        }

        throw new Error(`Failed to load clients: ${error.message}`);
      }

      // If no data from database, provide mock data in demo mode
      if ((!data || data.length === 0) && this.shouldUseMockData()) {
        console.info('No clients in database, using mock client data for demo');
        return this.getMockClients();
      }

      return data || [];
    } catch (error) {
      // Network error fallback to mock data in demo mode
      if (this.shouldUseMockData()) {
        console.warn('Network error, falling back to mock client data:', error);
        return this.getMockClients();
      }

      await reportSupabaseError('clients', 'select', error, {
        operation: 'loadAllClients',
        errorType: 'network',
      });
      throw error;
    }
  }

  /**
   * Determine if mock data should be used (demo/development mode)
   */
  private shouldUseMockData(): boolean {
    if (typeof window === 'undefined') return false;

    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
    const isDemo = hostname.includes('demo') || window.location.search.includes('demo=true');

    return isDev || isDemo;
  }

  /**
   * Provide mock client data that's transparent to the view layer
   */
  private getMockClients(): Client[] {
    return [
      {
        client_id: 'mock-hygge-hvidlog',
        client_code: 'hygge-hvidlog',
        legal_name: 'Hygge & Hvidløg ApS',
        industry: 'Food & Beverage',
        domain: 'hygge-hvidlog.dk',
        tier: 'pro',
        status: 'active',
        created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
        updated_at: new Date().toISOString(),
      },
      {
        client_id: 'mock-meridian-brands',
        client_code: 'meridian-brands',
        legal_name: 'Meridian Brands International',
        industry: 'Consumer Goods',
        domain: 'meridianbrands.com',
        tier: 'enterprise',
        status: 'active',
        created_at: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 180 days ago
        updated_at: new Date().toISOString(),
      },
      {
        client_id: 'mock-nets-demo',
        client_code: 'nets-demo',
        legal_name: 'Nets Demo Corporation',
        industry: 'Financial Services',
        domain: 'nets-demo.com',
        tier: 'free',
        status: 'active',
        created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        updated_at: new Date().toISOString(),
      },
    ];
  }

  /**
   * Load a specific client and its basic data (with transparent mock data fallback)
   */
  async loadClient(clientId: string): Promise<Client | null> {
    try {
      const supabase = getCurrentSupabaseClient();
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (error) {
        await reportSupabaseError('clients', 'select', error, {
          operation: 'loadClient',
          clientId,
        });

        // In demo/development mode, check mock data
        if (this.shouldUseMockData()) {
          const mockClient = this.getMockClients().find((c) => c.client_id === clientId);
          if (mockClient) {
            console.warn(`Database error for client ${clientId}, using mock data`);
            return mockClient;
          }
        }

        throw new Error(`Failed to load client: ${error.message}`);
      }

      return data;
    } catch (error) {
      // Network error fallback to mock data in demo mode
      if (this.shouldUseMockData()) {
        const mockClient = this.getMockClients().find((c) => c.client_id === clientId);
        if (mockClient) {
          console.warn(`Network error for client ${clientId}, using mock data:`, error);
          return mockClient;
        }
      }

      await reportSupabaseError('clients', 'select', error, {
        operation: 'loadClient',
        clientId,
        errorType: 'network',
      });
      throw error;
    }
  }

  /**
   * Switch to a different client (for demo purposes)
   */
  async switchToClient(clientId: string): Promise<Client> {
    const client = await this.loadClient(clientId);

    if (!client) {
      throw new Error(`Client with ID ${clientId} not found`);
    }

    // Store selection in localStorage for persistence
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.warn('[ClientService] localStorage not available - skipping persistence');
      return client;
    }

    try {
      // First, test if localStorage is working at all
      const testKey = 'localStorage_test_' + Date.now();
      const testValue = 'test_value_' + Math.random();

      console.log('[ClientService] Testing localStorage functionality...');
      localStorage.setItem(testKey, testValue);
      const testRetrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);

      if (testRetrieved !== testValue) {
        console.error(
          '[ClientService] ❌ localStorage is not working! Test failed. Set:',
          testValue,
          'Got:',
          testRetrieved
        );
        throw new Error('localStorage is not functioning properly');
      }

      console.log('[ClientService] ✅ localStorage test passed');

      // Now store the actual client selection
      localStorage.setItem('selectedClientId', clientId);
      console.log('[ClientService] Stored clientId in localStorage:', clientId);

      // Verify it was actually stored
      const stored = localStorage.getItem('selectedClientId');
      console.log('[ClientService] Verification - retrieved from localStorage:', stored);

      if (stored !== clientId) {
        console.error(
          '[ClientService] ❌ localStorage persistence failed! Set:',
          clientId,
          'Got:',
          stored
        );
        throw new Error('localStorage persistence verification failed');
      }

      console.log('[ClientService] ✅ localStorage persistence verified');
    } catch (error) {
      console.error('[ClientService] ❌ localStorage operation failed:', error);
      // Don't throw - allow the client switch to continue even if persistence fails
    }

    return client;
  }

  /**
   * Get the previously selected client from localStorage
   */
  getStoredClientId(): string | null {
    // Ensure we're in browser context
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log('[ClientService] Not in browser context or localStorage unavailable');
      return null;
    }

    try {
      const stored = localStorage.getItem('selectedClientId');
      console.log('[ClientService] getStoredClientId() called, result:', stored);

      // Also log all localStorage keys for debugging
      const allKeys = Object.keys(localStorage);
      console.log('[ClientService] All localStorage keys:', allKeys);

      return stored;
    } catch (error) {
      console.error('[ClientService] ❌ Failed to get stored client ID:', error);
      return null;
    }
  }

  /**
   * Clear stored client selection
   */
  clearStoredClient(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      console.log('[ClientService] localStorage not available - cannot clear stored client');
      return;
    }

    try {
      localStorage.removeItem('selectedClientId');
      console.log('[ClientService] Cleared stored client selection');
    } catch (error) {
      console.error('[ClientService] ❌ Failed to clear stored client:', error);
    }
  }
}
