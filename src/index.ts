/**
 * Flows DB - Main Entry Point
 * 
 * This is the main entry point for the @thepia/flows-db package.
 * It exports all the core functionality including:
 * - FlowsDBClient for service worker communication
 * - Supabase client utilities for direct database access
 * - Type definitions and constants
 */

// Export the main FlowsDB client
export { FlowsDBClient, resetFlowsDB, INDEXEDDB_NAME, INDEXEDDB_VERSION, decodeJWTPayload, type JWTPayload } from './lib/flows-client.ts';

// Export Supabase utilities for direct database access
export {
	createSupabaseClient,
	createReactiveSupabaseClient,
	createSupabaseConfigFromEnv,
	getUserContext,
	hasAdminAccess,
	type SupabaseConfig,
	type SupabaseClientOptions
} from './lib/supabase-client.ts';

export {
	createFlowsSupabaseConfig,
	createFlowsSupabaseClient,
	createReactiveFlowsSupabaseClient,
	createAdminFlowsSupabaseClient,
	setupFlowsDemo,
	DEMO_CLIENT_IDS
} from './lib/flows-supabase.ts';

// Export all types
export * from './types/index.ts';
