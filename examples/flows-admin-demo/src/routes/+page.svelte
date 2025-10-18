<script lang="ts">
import FloatingStatusButton from '$lib/components/FloatingStatusButton.svelte';
import TabContentRouter from '$lib/components/TabContentRouter.svelte';
import AppNavigation from '$lib/components/navigation/AppNavigation.svelte';
import { getMockOffboardingData, getTasksForProcess } from '$lib/mockData/offboarding';
import {
  applications,
  client,
  error,
  getClientMetrics,
  loadDemoData,
  loading,
} from '$lib/stores/data';
import { getAuthStoreFromContext } from '@thepia/flows-auth';
import { supabaseClientStore, isSupabaseAuthenticatedStore } from '$lib/contexts/supabase-context.ts';
import { onMount } from 'svelte';

// Get auth store from context and Supabase client from global store
const authStore = getAuthStoreFromContext();

// Auth state tracking - use auth store state machine pattern
const authState = $derived({
  isAuthenticated: $authStore.state === "authenticated" && !!$authStore.supabase_token,
  hasSupabaseToken: !!$authStore.supabase_token,
  error: $authStore.error
});

// Tab state - using $state for Svelte 5 reactivity
let activeTab = $state('people');

// Reactive selectedApp calculation that updates when either activeTab or applications change
const selectedApp = $derived($applications?.find((app) => app.code === activeTab) || null);

// Applications reactive logic with proper guards
const applicationsLoaded = $derived($applications && Array.isArray($applications) && $applications.length > 0);

// State for different tabs - using $state for Svelte 5 reactivity
let offboardingView = $state('overview');
let selectedTemplate = $state(null);
let selectedProcess = $state(null);
let offboardingTemplates = $state([]);
let offboardingProcesses = $state([]);
let allProcesses = $state([]);
let offboardingTasks = $state([]);

// Account state - using $state for Svelte 5 reactivity
let tfcBalance = $state(null);
let recentInvoices = $state([]);
let accountContacts = $state([]);
let loadingAccount = $state(false);

// Process filtering
let processFilters = {
  status: null,
  timeframe: null,
  search: '',
  department: null,
  priority: null,
  template: null,
};
let showProcessList = false;

// Functions from original component
function applyProcessFilter(filterType, filterValue) {
  processFilters = {
    status: null,
    timeframe: null,
    search: '',
    department: null,
    priority: null,
    template: null,
  };
  processFilters[filterType] = filterValue;
  showProcessList = true;
}

function clearProcessFilters() {
  processFilters = {
    status: null,
    timeframe: null,
    search: '',
    department: null,
    priority: null,
    template: null,
  };
  showProcessList = false;
}

async function generateProcessData() {
  console.log('🔄 Starting process data generation...');

  // Check if user is authenticated
  if (!authState.isAuthenticated || !$supabaseClientStore) {
    alert('Please sign in first to access the database');
    return;
  }

  try {
    const { data: clientData, error: clientError } = await $supabaseClientStore
      .from('clients')
      .select('id, client_code')
      .eq('client_code', 'hygge-hvidlog')
      .single();

    if (clientError) {
      console.error('❌ Error fetching client:', clientError);
      alert('Error: Could not find hygge-hvidlog client');
      return;
    }

    if (!clientData) {
      console.error('❌ Hygge & Hvidløg client not found');
      alert('Error: hygge-hvidlog client not found in database');
      return;
    }

    console.log(`📊 Working with client: ${clientData.client_code}`);
    alert('Demo process data generation completed!');
  } catch (err) {
    console.error('Error generating process data:', err);
    alert(`Error generating process data: ${err.message}`);
  }
}

async function loadAccountData() {
  if (!$client?.id) return;

  loadingAccount = true;

  try {
    // Load TFC balance, invoices, and contacts
    // Simplified for now - full implementation would be in AccountService
    recentInvoices = [];
    accountContacts = [];
  } catch (error) {
    console.error('Error loading account data:', error);
  } finally {
    loadingAccount = false;
  }
}

// Load data and metrics when authenticated
$effect(() => {
  if (authState.isAuthenticated && $supabaseClientStore) {
    // Load demo data first, then metrics (to ensure client data is available)
    loadDemoData()
      .then(() => {
        // Load metrics after client data is loaded
        return getClientMetrics();
      })
      .then(metrics => {
        console.log('📊 Metrics loaded:', metrics);
      })
      .catch(error => {
        console.error('Error loading demo data or metrics:', error);
      });
  }
});

// Load mock data on mount (doesn't require authentication)
onMount(() => {
  // Load offboarding mock data
  offboardingTemplates = getMockOffboardingData().templates;
  offboardingProcesses = getMockOffboardingData().processes;
  allProcesses = [...offboardingProcesses];

  // Load account data (mock data, doesn't require auth)
  loadAccountData().catch(error => {
    console.error('Error loading account data:', error);
  });
});

// Handle tab changes
function handleTabChange(event) {
  activeTab = event.detail.tab;
  console.log('🔄 Tab changed to:', activeTab);
}

// Application tab clicks
$effect(() => {
  if (applicationsLoaded) {
    const validTabs = ['people', 'processes', 'account', ...$applications.map((app) => app.code)];
    if (!validTabs.includes(activeTab)) {
      activeTab = 'people';
    }
  }
});
</script>

<svelte:head>
  <title>
    Flows Admin - {$client?.name || 'Loading...'}
  </title>
</svelte:head>

<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="app-loaded">
  <!-- Navigation -->
  <AppNavigation
    bind:activeTab
    applications={$applications}
    {applicationsLoaded}
    on:tabChange={handleTabChange}
  />



  <!-- Authentication Status Banner -->
   <!--
  {#if !authState.isAuthenticated}
    <div class="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div class="flex items-center gap-3">
        <span class="text-yellow-600 text-lg">⚠️</span>
        <div>
          <p class="text-yellow-800 font-semibold">Database Access Unavailable</p>
          <p class="text-yellow-700 text-sm mt-1">
            Please sign in to access database features.
            <a href="/auth-test" class="underline hover:no-underline ml-2">Go to Auth Test page →</a>
          </p>
        </div>
      </div>
    </div>
  {:else}
    <div class="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
      <div class="flex items-center gap-3">
        <span class="text-green-600 text-lg">✅</span>
        <div>
          <p class="text-green-800 font-semibold">Database Connected</p>
          <p class="text-green-700 text-sm mt-1">
            Authenticated with Supabase. Database features are available.
          </p>
        </div>
      </div>
    </div>
  {/if}
  -->

  <!-- Content Router -->
  <TabContentRouter
    {activeTab}
    {selectedApp}
    loading={$loading}
    error={$error}
    {allProcesses}
    bind:selectedProcess
    {generateProcessData}
    {recentInvoices}
    {accountContacts}
    {loadingAccount}
  />

  <!-- Floating Status -->
  <FloatingStatusButton />
</main>