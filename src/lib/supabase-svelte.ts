/**
 * Svelte-specific Supabase client utilities
 * 
 * This module provides Svelte-specific reactive patterns for Supabase clients.
 * These utilities work with Svelte stores and provide reactive updates.
 */

import { derived, type Readable } from 'svelte/store';
import { getContext } from 'svelte';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthStore } from '@thepia/flows-auth';
import {
  createSupabaseClient,
  createReactiveSupabaseClient,
  type SupabaseConfig,
  type SupabaseClientOptions
} from './supabase-client.js';
import {
  createFlowsSupabaseConfig,
  DEMO_CLIENT_IDS
} from './flows-supabase.js';

// Type for Svelte-compatible auth store (has subscribe method)
export interface SvelteAuthStore extends Readable<AuthStore> {
  getState: () => AuthStore;
  subscribe: (callback: (state: AuthStore) => void) => () => void;
}

/**
 * Create a reactive Supabase client that updates when auth state changes (Svelte-specific)
 * 
 * @param config - Supabase configuration
 * @param authStore - Svelte-compatible auth store
 * @param options - Client options
 * @returns Svelte Readable store containing SupabaseClient
 */
export function createSvelteReactiveSupabaseClient(
  config: SupabaseConfig,
  authStore: SvelteAuthStore,
  options: SupabaseClientOptions = {}
): Readable<SupabaseClient> {
  return derived(authStore, ($authState) => {
    return createSupabaseClient(config, {
      ...options,
      authState: $authState
    });
  });
}

/**
 * Get flows-specific Supabase client from Svelte context
 *
 * Expects flows-auth to have set up the auth store context using setupAuthContext().
 * Uses the standard flows-auth context key 'flows-auth-store'.
 *
 * @param options - Client options including optional clientCode
 * @returns Reactive Supabase client or fallback client
 */
export function getSvelteFlowsSupabaseFromContext(
  options: SupabaseClientOptions & {
    clientCode?: keyof typeof DEMO_CLIENT_IDS;
  } = {}
): Readable<SupabaseClient> | SupabaseClient {
  try {
    // Use the standard flows-auth context key
    const authStore = getContext<SvelteAuthStore>('flows-auth-store');
    if (!authStore) {
      throw new Error('Auth store not found in context. Make sure flows-auth setupAuthContext() was called in your root layout.');
    }

    const config = createFlowsSupabaseConfig();
    return createSvelteReactiveSupabaseClient(config, authStore, options);
  } catch (error) {
    console.error('Failed to get flows Supabase client from context:', error);
    const config = createFlowsSupabaseConfig();
    return createSupabaseClient(config, { skipAuth: true });
  }
}
