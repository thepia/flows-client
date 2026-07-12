<script lang="ts">
import { clientStore } from '$lib/stores/domains/client/client.store';

// Extract what we need from the store
const { clients, currentClient, loading, error, availableClients, actions } = clientStore;

// Local component state
let _isChanging = false;

// Handle client selection
async function _handleClientChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  const clientId = target.value;

  if (!clientId || clientId === $currentClient?.client_id) return;

  try {
    _isChanging = true;
    await actions.selectClient(clientId);
    // Emit custom event for parent components to react
    dispatchEvent(
      new CustomEvent('clientChanged', {
        detail: { clientId },
      })
    );
  } catch (error) {
    console.error('Failed to switch client:', error);
    // Reset select to previous value
    target.value = $currentClient?.client_id || '';
  } finally {
    _isChanging = false;
  }
}

// Dispatch events
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher<{
  clientChanged: { clientId: string };
}>();

function dispatchEvent(event: CustomEvent) {
  dispatch(event.type as 'clientChanged', event.detail);
}
</script>

<div class="space-y-2">
  <div class="flex items-center gap-2">
    <Building2 class="w-4 h-4" />
    <span class="text-sm font-medium">Demo Client</span>
    {#if $loading || isChanging}
      <RefreshCw class="w-3 h-3 animate-spin text-blue-600" />
    {/if}
  </div>
  
  {#if $error}
    <div class="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
      <AlertCircle class="w-3 h-3" />
      <span>{$error}</span>
    </div>
  {/if}
  
  {#if $availableClients.length > 0}
    <select
      class="w-full px-3 py-2 text-sm border rounded-md bg-white"
      value={$currentClient?.client_id || ''}
      disabled={$loading || isChanging}
      on:change={handleClientChange}
    >
      <option value="">Select a client...</option>
      {#each $availableClients as client (client.client_id)}
        <option value={client.client_id}>
          {client.legal_name} ({client.client_code})
        </option>
      {/each}
    </select>
    
    {#if $currentClient}
      <div class="text-xs text-gray-600">
        <div><strong>Industry:</strong> {$currentClient.industry || 'Not specified'}</div>
        <div><strong>Tier:</strong> {$currentClient.tier}</div>
      </div>
    {/if}
  {:else if $loading}
    <div class="text-xs text-gray-500">Loading clients...</div>
  {:else}
    <div class="text-xs text-gray-500">No clients available</div>
  {/if}
</div>