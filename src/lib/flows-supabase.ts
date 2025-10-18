/**
 * Flows-specific Supabase configuration and helpers
 */

import type { AuthStore } from '@thepia/flows-auth';
import { 
  createSupabaseClient, 
  createReactiveSupabaseClient,
  createSupabaseConfigFromEnv,
  type SupabaseConfig,
  type SupabaseClientOptions
} from './supabase-client.ts';

const DEFAULT_FLOWS_CONFIG: Partial<SupabaseConfig> = {
  url: 'https://jstbkvkurjsopuwhlsvy.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzdGJrdmt1cmpzb3B1d2hsc3Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NjY1NjgsImV4cCI6MjA2NjU0MjU2OH0.bTvbfXQXz7PSj9GfeZIOpU5haMUWNVDw-8erflfEdl8',
  schema: 'api',
  debug: false
};

export const DEMO_CLIENT_IDS = {
  'hygge-hvidlog': '453a82ec-c5b7-48c9-8244-4c978b9c7e11',
  'nets-demo': '123e4567-e89b-12d3-a456-426614174000',
  'meridian-brands': '987fcdeb-51a2-43d1-b789-123456789abc'
} as const;

export function createFlowsSupabaseConfig(overrides?: Partial<SupabaseConfig>): SupabaseConfig {
  const envConfig = createSupabaseConfigFromEnv(DEFAULT_FLOWS_CONFIG);
  
  return {
    ...envConfig,
    ...overrides
  };
}

export function createFlowsSupabaseClient(
  authStore: { getState: () => AuthStore },
  options: SupabaseClientOptions & {
    clientCode?: keyof typeof DEMO_CLIENT_IDS;
    config?: Partial<SupabaseConfig>;
  } = {}
) {
  const { clientCode, config: configOverrides, ...clientOptions } = options;
  
  const config = createFlowsSupabaseConfig({
    defaultClientId: clientCode ? DEMO_CLIENT_IDS[clientCode] : undefined,
    ...configOverrides
  });

  const authState = authStore.getState();
  
  return createSupabaseClient(config, {
    ...clientOptions,
    authState
  });
}

export function createReactiveFlowsSupabaseClient(
  authStore: { subscribe: (callback: (state: AuthStore) => void) => () => void; getState?: () => AuthStore },
  options: SupabaseClientOptions & {
    clientCode?: keyof typeof DEMO_CLIENT_IDS;
    config?: Partial<SupabaseConfig>;
  } = {}
) {
  const { clientCode, config: configOverrides, ...clientOptions } = options;
  
  const config = createFlowsSupabaseConfig({
    defaultClientId: clientCode ? DEMO_CLIENT_IDS[clientCode] : undefined,
    ...configOverrides
  });

  return createReactiveSupabaseClient(config, authStore, clientOptions);
}

// Note: getFlowsSupabaseFromContext moved to supabase-svelte.ts
// Use the Svelte-specific utilities for context access

export function createAdminFlowsSupabaseClient(
  options: {
    clientCode?: keyof typeof DEMO_CLIENT_IDS;
    config?: Partial<SupabaseConfig>;
  } = {}
) {
  const { clientCode, config: configOverrides } = options;
  
  const config = createFlowsSupabaseConfig({
    defaultClientId: clientCode ? DEMO_CLIENT_IDS[clientCode] : undefined,
    ...configOverrides
  });

  return createSupabaseClient(config, { 
    useServiceRole: true,
    skipAuth: true 
  });
}

export async function setupFlowsDemo(clientCode: keyof typeof DEMO_CLIENT_IDS = 'hygge-hvidlog') {
  return {
    role: 'thepia_staff',
    client_code: clientCode,
    client_id: DEMO_CLIENT_IDS[clientCode]
  };
}
