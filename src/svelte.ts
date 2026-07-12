/**
 * Flows DB - Svelte Entry Point
 *
 * This entry point provides Svelte-specific utilities for @thepia/flows-client.
 * Only import this in Svelte applications.
 *
 * For framework-agnostic utilities, use the main entry point:
 * import { ... } from '@thepia/flows-client'
 */

// Re-export all framework-agnostic utilities
export * from './index.ts';

// Export Svelte-specific utilities
export {
  createSvelteReactiveSupabaseClient,
  getSvelteFlowsSupabaseFromContext,
} from './lib/supabase-svelte.ts';
