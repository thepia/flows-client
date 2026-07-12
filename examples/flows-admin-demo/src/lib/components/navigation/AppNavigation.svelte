<script lang="ts">
import { createEventDispatcher } from 'svelte';
import type { Application } from '$lib/types';

export let activeTab: string;
export let applications: Application[] = [];
export let applicationsLoaded: boolean = false;

const dispatch = createEventDispatcher<{
  tabChange: { tab: string };
}>();

function _handleTabClick(tab: string) {
  activeTab = tab;
  dispatch('tabChange', { tab });
}
</script>

<div class="sticky top-0 z-10 bg-gray-50 border-b border-gray-200 mb-8 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 pt-2 pb-1">
  <nav class="-mb-px flex space-x-8">
    <!-- People Tab -->
    <button
      data-testid="tab-people"
      data-active={activeTab === 'people'}
      on:click={() => handleTabClick('people')}
      class="py-2 px-1 border-b-2 font-medium text-sm {
        activeTab === 'people' 
          ? 'border-blue-500 text-blue-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }"
    >
      <Users class="w-4 h-4 mr-2 inline" />
      People
    </button>

    <!-- Processes Tab -->
    <button
      data-testid="tab-processes"
      data-active={activeTab === 'processes'}
      on:click={() => handleTabClick('processes')}
      class="py-2 px-1 border-b-2 font-medium text-sm {
        activeTab === 'processes' 
          ? 'border-blue-500 text-blue-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }"
    >
      <Settings class="w-4 h-4 mr-2 inline" />
      Processes
    </button>

    <!-- Application Tabs -->
    {#if applicationsLoaded}
      {#each applications as app}
      <button
        data-testid="tab-{app.code}"
        data-active={activeTab === app.code}
        on:click={() => handleTabClick(app.code)}
        class="py-2 px-1 border-b-2 font-medium text-sm {
          activeTab === app.code 
            ? 'border-blue-500 text-blue-600' 
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }"
      >
        <Briefcase class="w-4 h-4 mr-2 inline" />
        {app.name}
      </button>
      {/each}
    {/if}

    <!-- Account Tab -->
    <button
      data-testid="tab-account"
      data-active={activeTab === 'account'}
      on:click={() => handleTabClick('account')}
      class="py-2 px-1 border-b-2 font-medium text-sm {
        activeTab === 'account' 
          ? 'border-blue-500 text-blue-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
      }"
    >
      <Settings class="w-4 h-4 mr-2 inline" />
      Account
    </button>
  </nav>
</div>