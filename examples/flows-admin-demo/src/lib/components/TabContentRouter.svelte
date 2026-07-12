<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { Application } from '$lib/types';

export let activeTab: string;
export let selectedApp: Application | null = null;
export let loading: boolean = false;
export let error: string | null = null;

// Props for ProcessesTab
export let allProcesses = [];
export let selectedProcess = null;
export let generateProcessData: () => void = () => {};

// Props for AccountTab
export let recentInvoices = [];
export let accountContacts = [];
export let loadingAccount = false;

const _dispatch = createEventDispatcher();

// Route to the correct tab content based on activeTab
$: isApplicationTab = selectedApp !== null && activeTab === selectedApp.code;
</script>

<!-- Loading State -->
{#if loading}
  <div class="flex items-center justify-center py-16" data-testid="loading-indicator">
    <LoadingAnimation message="Loading your demo workspace..." size="lg" />
  </div>
{:else if error}
  <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
    <div class="flex">
      <AlertCircle class="w-5 h-5 text-red-400 mr-2" />
      <div>
        <h3 class="text-sm font-medium text-red-800">Error loading data</h3>
        <p class="text-sm text-red-700 mt-1">{error}</p>
      </div>
    </div>
  </div>
{:else}
  <!-- Tab Content Router -->
  {#if activeTab === 'people'}
    <PeopleTab on:navigate={dispatch} />
  {:else if activeTab === 'processes'}
    <ProcessesTab 
      {allProcesses}
      bind:selectedProcess
      {generateProcessData}
      on:navigate={dispatch} 
      on:processSelect={dispatch}
    />
  {:else if activeTab === 'account'}
    <AccountTab 
      {recentInvoices}
      {accountContacts}
      {loadingAccount}
      on:navigate={dispatch} 
    />
  {:else if isApplicationTab}
    <ApplicationTab app={selectedApp} on:navigate={dispatch} />
  {:else}
    <!-- Fallback for unknown tabs -->
    <div class="text-center py-12">
      <div class="text-gray-500">
        <p class="text-lg font-medium">Tab not found</p>
        <p class="text-sm mt-2">The tab "{activeTab}" is not recognized</p>
      </div>
    </div>
  {/if}
{/if}