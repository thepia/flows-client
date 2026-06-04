import { writable, get, type Writable } from 'svelte/store';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SvelteAuthStore } from '@thepia/flows-auth';
import { createFlowsSupabaseClient } from '@thepia/flows-client';

// Global stores - the single source of truth for Supabase client access
// Used by both pages and services
export const supabaseClientStore: Writable<SupabaseClient | null> = writable(null);
export const isSupabaseAuthenticatedStore: Writable<boolean> = writable(false);

/**
 * Initialize global Supabase stores that react to auth changes
 * Call this in +layout.svelte after setting up auth context
 * Both pages and services can then use the global stores directly
 */
export function initializeSupabaseStores(authStore: SvelteAuthStore): void {
  let currentClient: SupabaseClient | null = null;
  let lastAuthState: string | null = null;

  // Function to update stores based on current auth state
  const updateStores = (authState: any) => {
    // Check auth state using state machine pattern
    const isAuthenticated = authState.state === "authenticated" && !!authState.supabase_token;

    // Only create new client if auth state actually changed
    if (authState.state !== lastAuthState) {
      console.log('🔄 Auth state changed:', { from: lastAuthState, to: authState.state });
      lastAuthState = authState.state;

      if (isAuthenticated && !currentClient) {
        console.log('🔐 Creating authenticated Supabase client');
        currentClient = createFlowsSupabaseClient(authStore, {
          clientCode: 'hygge-hvidlog'
        });
        console.log('✅ Supabase client created successfully');
      } else if (!isAuthenticated && currentClient) {
        console.log('🔒 Clearing Supabase client - authentication lost');
        currentClient = null;
      }

      // Update global stores only when state changes
      supabaseClientStore.set(currentClient);
      isSupabaseAuthenticatedStore.set(isAuthenticated);

      console.log('📊 Stores updated:', {
        clientAvailable: !!currentClient,
        isAuthenticated,
        stateTransition: `${lastAuthState} → ${authState.state}`
      });
    }
  };

  // Subscribe to auth changes and update global stores
  authStore.subscribe(updateStores);
}

/**
 * Get current Supabase client from global store (use in services/stores)
 * Throws error if not authenticated since auth is required
 */
export function getCurrentSupabaseClient(): SupabaseClient {
  const currentClient = get(supabaseClientStore);

  if (!currentClient) {
    throw new Error('Authentication required - please sign in to access the database');
  }

  return currentClient;
}
