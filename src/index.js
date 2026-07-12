/**
 * Flows DB - Main Entry Point
 *
 * This is the main entry point for the @thepia/flows-client package.
 * It exports all the core functionality including:
 * - FlowsClient for service worker communication
 * - Supabase client utilities for direct database access
 * - Type definitions and constants
 */

// Export the main FlowsClient
export {
  FlowsClient,
  INDEXEDDB_NAME,
  INDEXEDDB_VERSION,
  resetFlowsClient,
} from './lib/flows-client.js';
export {
  createAdminFlowsSupabaseClient,
  createFlowsSupabaseClient,
  createFlowsSupabaseConfig,
  createReactiveFlowsSupabaseClient,
  DEMO_CLIENT_IDS,
  getFlowsSupabaseFromContext,
  setupFlowsDemo,
} from './lib/flows-supabase.js';
// Export Supabase utilities for direct database access
export {
  createReactiveSupabaseClient,
  createSupabaseClient,
  createSupabaseConfigFromEnv,
  getUserContext,
  hasAdminAccess,
} from './lib/supabase-client.js';

// Export all types
export * from './types/index.js';
