<script lang="ts">
import type { SvelteAuthStore } from '@thepia/flows-auth';
import { getAuthStoreFromContext } from '@thepia/flows-auth';
import { createFlowsSupabaseConfig, getUserContext, hasAdminAccess } from '@thepia/flows-client';
import { createSvelteReactiveSupabaseClient } from '@thepia/flows-client/svelte';
import { onMount } from 'svelte';

let authStore: SvelteAuthStore;
let supabaseClient: any;
let authState: any = {};
let testResults: any[] = [];
let _loading = false;
let _indexedDBResult = '';

onMount(() => {
  // Get auth store from context using proper flows-auth pattern
  authStore = getAuthStoreFromContext();

  // Get reactive Supabase client
  if (authStore) {
    const config = createFlowsSupabaseConfig();
    supabaseClient = createSvelteReactiveSupabaseClient(config, authStore, {
      clientCode: 'hygge-hvidlog',
    });
  }

  // Get initial auth state and set up reactive updates
  if (authStore) {
    authState = authStore.getState();

    // Set up periodic state updates (since subscribe might not be available)
    const interval = setInterval(() => {
      if (authStore) {
        authState = authStore.getState();
      }
    }, 1000);

    // Cleanup interval on component destroy
    return () => clearInterval(interval);
  }
});

async function _testDatabaseAccess() {
  if (!supabaseClient) return;

  _loading = true;
  testResults = [];

  try {
    // Get current Supabase client
    const client = $supabaseClient;

    // Test 1: Check authentication status
    testResults.push({
      test: 'Authentication Status',
      result: authState.state === 'authenticated' ? 'Authenticated' : 'Not Authenticated',
      success: authState.state === 'authenticated',
      details: {
        user: authState.user?.email,
        hasAccessToken: !!authState.access_token,
        hasSupabaseToken: !!authState.supabase_token,
        accessTokenPreview: authState.access_token
          ? `${authState.access_token.substring(0, 20)}...`
          : 'none',
        supabaseTokenPreview: authState.supabase_token
          ? `${authState.supabase_token.substring(0, 20)}...`
          : 'none',
        supabaseTokenExpiry: authState.supabase_expires_at
          ? new Date(authState.supabase_expires_at).toISOString()
          : 'none',
      },
    });

    // Test 2: Check admin access
    const adminAccess = hasAdminAccess(authStore);
    testResults.push({
      test: 'Admin Access Check',
      result: adminAccess ? 'Has Admin Access' : 'No Admin Access',
      success: adminAccess,
      details: getUserContext(authStore),
    });

    // Test 3: Try to access clients table
    try {
      const { data: clients, error: clientsError } = await client
        .from('clients')
        .select('id, client_code, legal_name')
        .limit(3);

      testResults.push({
        test: 'Clients Table Access',
        result: clientsError
          ? `Error: ${clientsError.message}`
          : `Found ${clients?.length || 0} clients`,
        success: !clientsError,
        details: clientsError || clients,
      });
    } catch (error) {
      testResults.push({
        test: 'Clients Table Access',
        result: `Exception: ${error.message}`,
        success: false,
        details: error,
      });
    }

    // Test 4: Try to access people table
    try {
      const { data: people, error: peopleError } = await client
        .from('people')
        .select('id, email, first_name, last_name')
        .limit(3);

      testResults.push({
        test: 'People Table Access',
        result: peopleError
          ? `Error: ${peopleError.message}`
          : `Found ${people?.length || 0} people`,
        success: !peopleError,
        details: peopleError || people,
      });
    } catch (error) {
      testResults.push({
        test: 'People Table Access',
        result: `Exception: ${error.message}`,
        success: false,
        details: error,
      });
    }
  } catch (error) {
    testResults.push({
      test: 'General Error',
      result: `Failed: ${error.message}`,
      success: false,
      details: error,
    });
  } finally {
    _loading = false;
  }
}

// Test IndexedDB persistence
async function _testIndexedDBPersistence() {
  try {
    // Open IndexedDB directly to check what's stored
    const request = indexedDB.open('flows_db', 1);

    request.onsuccess = (event) => {
      const db = (event.target as any).result;
      const transaction = db.transaction(['auth_sessions'], 'readonly');
      const store = transaction.objectStore('auth_sessions');
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const sessions = getAllRequest.result;
        console.log('🗄️ IndexedDB auth_sessions:', sessions);

        if (sessions.length > 0) {
          const session = sessions[0];
          console.log('📋 Session details:', {
            userId: session.userId,
            email: session.email,
            hasAccessToken: !!session.accessToken,
            hasSupabaseToken: !!session.supabaseToken,
            supabaseTokenPreview: `${session.supabaseToken?.substring(0, 20)}...`,
            supabaseExpiresAt: session.supabaseExpiresAt
              ? new Date(session.supabaseExpiresAt).toISOString()
              : 'none',
            savedAt: session.savedAt,
          });
          _indexedDBResult = `✅ Found session in IndexedDB. Has Supabase token: ${!!session.supabaseToken}`;
        } else {
          _indexedDBResult = '❌ No sessions found in IndexedDB';
        }
      };

      getAllRequest.onerror = () => {
        console.error('❌ Failed to read from IndexedDB:', getAllRequest.error);
        _indexedDBResult = `❌ Failed to read: ${getAllRequest.error?.message}`;
      };
    };

    request.onerror = () => {
      console.error('❌ Failed to open IndexedDB:', request.error);
      _indexedDBResult = `❌ Failed to open: ${request.error?.message}`;
    };
  } catch (err: any) {
    console.error('❌ IndexedDB test exception:', err);
    _indexedDBResult = `❌ Exception: ${err.message}`;
  }
}
</script>

<div class="container mx-auto p-6">
  <h1 class="text-3xl font-bold mb-6">🔐 JWT-Authenticated Supabase Access Test</h1>
  
  <div class="bg-white rounded-lg shadow p-6 mb-6">
    <h2 class="text-xl font-semibold mb-4">Current Auth State</h2>
    <div class="grid grid-cols-2 gap-4 text-sm">
      <div>
        <strong>State:</strong> 
        <span class="px-2 py-1 rounded text-xs {authState.state === 'authenticated' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          {authState.state || 'unknown'}
        </span>
      </div>
      <div>
        <strong>User:</strong> {authState.user?.email || 'none'}
      </div>
      <div>
        <strong>Has Access Token:</strong>
        <span class="px-2 py-1 rounded text-xs {authState.access_token ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          {authState.access_token ? 'Yes' : 'No'}
        </span>
      </div>
      <div>
        <strong>Has Supabase Token:</strong>
        <span class="px-2 py-1 rounded text-xs {authState.supabase_token ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
          {authState.supabase_token ? 'Yes' : 'No'}
        </span>
      </div>
      <div class="col-span-2">
        <strong>Access Token Preview:</strong>
        <code class="text-xs bg-gray-100 px-1 rounded">
          {authState.access_token ? `${authState.access_token.substring(0, 20)}...` : 'none'}
        </code>
      </div>
      <div class="col-span-2">
        <strong>Supabase Token Preview:</strong>
        <code class="text-xs bg-gray-100 px-1 rounded">
          {authState.supabase_token ? `${authState.supabase_token.substring(0, 20)}...` : 'none'}
        </code>
      </div>
    </div>
  </div>

  <div class="bg-white rounded-lg shadow p-6 mb-6">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Database Access Tests</h2>
      <div class="space-x-2">
        <button
          on:click={testDatabaseAccess}
          disabled={loading}
          class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
        >
          {loading ? 'Testing...' : 'Run Tests'}
        </button>
        <button
          on:click={testIndexedDBPersistence}
          class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
        >
          Check IndexedDB
        </button>
      </div>
    </div>

    {#if indexedDBResult}
      <div class="mb-4 p-3 rounded {indexedDBResult.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
        <strong>IndexedDB Test:</strong> {indexedDBResult}
      </div>
    {/if}

    {#if testResults.length > 0}
      <div class="space-y-4">
        {#each testResults as test}
          <div class="border rounded p-4 {test.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
            <div class="flex justify-between items-start mb-2">
              <h3 class="font-medium">{test.test}</h3>
              <span class="text-sm px-2 py-1 rounded {test.success ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}">
                {test.success ? 'PASS' : 'FAIL'}
              </span>
            </div>
            <p class="text-sm text-gray-700 mb-2">{test.result}</p>
            {#if test.details}
              <details class="text-xs">
                <summary class="cursor-pointer text-gray-600">Details</summary>
                <pre class="mt-2 p-2 bg-gray-100 rounded overflow-auto">{JSON.stringify(test.details, null, 2)}</pre>
              </details>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="text-gray-500 text-center py-8">Click "Run Tests" to test database access with JWT authentication</p>
    {/if}
  </div>

  <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
    <h3 class="font-medium text-blue-800 mb-2">🎯 What This Demonstrates</h3>
    <ul class="text-sm text-blue-700 space-y-1">
      <li>• <strong>JWT Authentication:</strong> Uses access tokens from flows-auth instead of hardcoded service keys</li>
      <li>• <strong>Reactive Client:</strong> Supabase client automatically updates when auth state changes</li>
      <li>• <strong>RLS Enforcement:</strong> Database queries respect Row Level Security based on JWT claims</li>
      <li>• <strong>Proper Authorization:</strong> Users only see data they're authorized to access</li>
      <li>• <strong>Error Handling:</strong> Graceful handling of unauthorized access attempts</li>
    </ul>
  </div>

  <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <h3 class="font-medium text-yellow-800 mb-2">⚠️ Before vs After</h3>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
      <div>
        <h4 class="font-medium text-red-700 mb-2">❌ Before (Insecure)</h4>
        <ul class="text-red-600 space-y-1">
          <li>• Hardcoded service role keys</li>
          <li>• Bypasses all RLS policies</li>
          <li>• Full admin access for all users</li>
          <li>• Security risk in client-side code</li>
        </ul>
      </div>
      <div>
        <h4 class="font-medium text-green-700 mb-2">✅ After (Secure)</h4>
        <ul class="text-green-600 space-y-1">
          <li>• JWT tokens from authentication server</li>
          <li>• Proper RLS enforcement</li>
          <li>• User-specific data access</li>
          <li>• Secure token-based authorization</li>
        </ul>
      </div>
    </div>
  </div>
</div>
