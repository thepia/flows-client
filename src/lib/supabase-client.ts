/**
 * Generalized Supabase Client for flows-db
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { AuthStore } from '@thepia/flows-auth';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
  schema?: string;
  defaultClientId?: string;
  debug?: boolean;
}

export interface SupabaseClientOptions {
  useServiceRole?: boolean;
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

/**
 * Create a Supabase client that updates when auth state changes
 * Framework-agnostic version - works with any store that has subscribe()
 */
export function createReactiveSupabaseClient(
  config: SupabaseConfig,
  authStore: { subscribe: (callback: (state: AuthStore) => void) => () => void; getState?: () => AuthStore },
  options: SupabaseClientOptions = {}
): { subscribe: (callback: (client: SupabaseClient) => void) => () => void } {
  return {
    subscribe: (callback: (client: SupabaseClient) => void) => {
      return authStore.subscribe((authState) => {
        const client = createSupabaseClient(config, {
          ...options,
          authState
        });
        callback(client);
      });
    }
  };
}

export function createSupabaseClient(
  config: SupabaseConfig,
  options: SupabaseClientOptions & { authState?: any } = {}
): SupabaseClient<any, 'public', any> {
  const {
    useServiceRole = false,
    skipAuth = false,
    headers = {},
    authState
  } = options;

  const key = useServiceRole && config.serviceRoleKey
    ? config.serviceRoleKey
    : config.anonKey;

  let authToken: string | null = null;
  if (!skipAuth && authState) {
    const hasValidSupabaseToken = authState.supabase_token && authState.state === 'authenticated';
    authToken = hasValidSupabaseToken ? authState.supabase_token : null;
  }

  const client = createClient<any, 'public', any>(config.url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      storage: undefined,
    },
    db: {
      schema: (config.schema || 'api') as 'public',
    },
    global: {
      headers: {
        ...headers,
        // Cache CORS preflight responses for 24 hours to reduce OPTIONS requests
        // This tells the browser to cache the preflight response, dramatically reducing
        // the number of OPTIONS requests sent to Supabase
        'Access-Control-Max-Age': '86400',
        ...(authToken && {
          Authorization: `Bearer ${authToken}`
        })
      }
    }
  });

  return client;
}

export function createSupabaseConfigFromEnv(
  fallbacks?: Partial<SupabaseConfig>
): SupabaseConfig {
  const isBrowser = typeof window !== 'undefined';

  const metaEnv = (import.meta as any).env || {};

  const url = isBrowser
    ? metaEnv.SUPABASE_URL
    : process.env?.SUPABASE_URL;

  const anonKey = isBrowser
    ? metaEnv.SUPABASE_ANON_KEY
    : process.env?.SUPABASE_ANON_KEY;

  return {
    url: url || fallbacks?.url || '',
    anonKey: anonKey || fallbacks?.anonKey || '',
    schema: fallbacks?.schema || 'api',
    defaultClientId: fallbacks?.defaultClientId,
    debug: fallbacks?.debug || false
  };
}

export function getUserContext(authStore: AuthStore | any) {
  // AuthStore is a Zustand store with core.getState() method
  const state = authStore.core?.getState?.() || authStore.getState?.();
  if (state?.state !== 'authenticated' || !state?.user) {
    return null;
  }

  return {
    userId: state.user.id,
    email: state.user.email,
    role: 'authenticated',
    supabaseToken: state.supabase_token,
    accessToken: state.access_token
  };
}

export function hasAdminAccess(authStore: AuthStore | any): boolean {
  // AuthStore is a Zustand store with core.getState() method
  const state = authStore.core?.getState?.() || authStore.getState?.();
  return state?.state === 'authenticated' && !!state?.user?.email;
}
