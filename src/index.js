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
export { FlowsClient, resetFlowsClient, INDEXEDDB_NAME, INDEXEDDB_VERSION } from './lib/flows-client.js';

// Export Supabase utilities for direct database access
export {
	createSupabaseClient,
	createReactiveSupabaseClient,
	createSupabaseConfigFromEnv,
	getUserContext,
	hasAdminAccess,
	type SupabaseConfig,
	type SupabaseClientOptions
} from './lib/supabase-client.js';

export {
	createFlowsSupabaseConfig,
	createFlowsSupabaseClient,
	createReactiveFlowsSupabaseClient,
	getFlowsSupabaseFromContext,
	createAdminFlowsSupabaseClient,
	setupFlowsDemo,
	DEMO_CLIENT_IDS
} from './lib/flows-supabase.js';

// Export all types
export * from './types/index.js';
