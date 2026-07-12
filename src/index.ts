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
  decodeJWTPayload,
  FlowsClient,
  getFlowsClient,
  hasThepiaWebKit,
  INDEXEDDB_NAME,
  INDEXEDDB_VERSION,
  type JWTPayload,
  notifyNativeAppState,
  resetFlowsClient,
  updatePageBackground,
} from './lib/flows-client';
export {
  createAdminFlowsSupabaseClient,
  createFlowsSupabaseClient,
  createFlowsSupabaseConfig,
  createReactiveFlowsSupabaseClient,
  DEMO_CLIENT_IDS,
  setupFlowsDemo,
} from './lib/flows-supabase';
// Export Supabase utilities for direct database access
export {
  createReactiveSupabaseClient,
  createSupabaseClient,
  createSupabaseConfigFromEnv,
  getUserContext,
  hasAdminAccess,
  type SupabaseClientOptions,
  type SupabaseConfig,
} from './lib/supabase-client';

// Export all types
export * from './types/index';
