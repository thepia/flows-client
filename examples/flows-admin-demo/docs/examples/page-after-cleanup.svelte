<!-- 
  ARCHITECTURE CLEANUP EXAMPLE
  This demonstrates how +page.svelte should look after cleanup
  Current: 1,462 lines → Target: ~100 lines
-->
<script lang="ts">
import { onMount } from 'svelte';
import FloatingStatusButton from '$lib/components/FloatingStatusButton.svelte';
import AppNavigation from '$lib/components/navigation/AppNavigation.svelte';
import TabContentRouter from '$lib/components/TabContentRouter.svelte';
import { useTabNavigation } from '$lib/composables/useTabNavigation';
import { applications, applicationsActions } from '$lib/stores/applications.store';
import { client } from '$lib/stores/data';

// Initialize navigation composable
const { activeTab, selectedApp, navigateToTab } = useTabNavigation(applications);

// Load data on mount
onMount(async () => {
  // Wait for client to be available
  const unsubscribe = client.subscribe(async ($client) => {
    if ($client?.id) {
      await applicationsActions.loadApplications($client.id);
      unsubscribe();
    }
  });
});

// Handle navigation events
function handleTabChange(event) {
  navigateToTab(event.detail.tab);
}
</script>

<svelte:head>
  <title>
    Flows Admin - {$client?.name || 'Loading...'}
  </title>
</svelte:head>

<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="app-loaded">
  <!-- Navigation -->
  <AppNavigation 
    bind:activeTab={$activeTab}
    applications={$applications}
    applicationsLoaded={$applicationsLoaded}
    on:tabChange={handleTabChange}
  />

  <!-- Content Router -->
  <TabContentRouter 
    activeTab={$activeTab}
    selectedApp={$selectedApp}
    loading={$loading}
    error={$error}
  />

  <!-- Floating Status -->
  <FloatingStatusButton />
</main>

<style>
  /* Minimal page-specific styles */
</style>