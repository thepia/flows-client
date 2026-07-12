import { derived, get, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { ClientService } from './client.service';
import type { Client, ClientActions, ClientState } from './client.types';

// Service instance
const clientService = new ClientService();

// Base state store
const state = writable<ClientState>({
  clients: [],
  currentClient: null,
  loading: false,
  error: null,
});

// Derived stores for computed values
export const clients = derived(state, ($state) => $state.clients);
export const currentClient = derived(state, ($state) => $state.currentClient);
export const loading = derived(state, ($state) => $state.loading);
export const error = derived(state, ($state) => $state.error);

// Derived computed stores
export const availableClients = derived(clients, ($clients) =>
  $clients.filter((c) => c.status === 'active')
);

export const clientsByTier = derived(clients, ($clients) => {
  return $clients.reduce(
    (acc, client) => {
      if (!acc[client.tier]) acc[client.tier] = [];
      acc[client.tier].push(client);
      return acc;
    },
    {} as Record<string, Client[]>
  );
});

export const isClientSelected = derived(currentClient, ($currentClient) => !!$currentClient);

// Actions
const actions: ClientActions = {
  async loadAllClients() {
    state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const clients = await clientService.loadAllClients();

      state.update((s) => ({
        ...s,
        clients,
        loading: false,
      }));

      // If we have a stored client selection but no current client, restore it
      const storedClientId = clientService.getStoredClientId();
      console.log(
        '[ClientStore] After loading clients, storedClientId:',
        storedClientId,
        'currentClient:',
        get(currentClient)
      );
      if (storedClientId && !get(currentClient)) {
        console.log('[ClientStore] Attempting to restore stored client:', storedClientId);
        try {
          await actions.selectClient(storedClientId);
          console.log('[ClientStore] ✅ Successfully restored stored client');
        } catch (error) {
          // If stored client can't be loaded, clear it
          clientService.clearStoredClient();
          console.warn('[ClientStore] ❌ Stored client could not be loaded:', error);
        }
      } else if (!storedClientId) {
        console.log('[ClientStore] No stored client selection found');
      } else {
        console.log('[ClientStore] Current client already set, not restoring from storage');
      }
    } catch (error) {
      state.update((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load clients',
      }));
    }
  },

  async selectClient(clientId: string) {
    state.update((s) => ({ ...s, loading: true, error: null }));

    try {
      const client = await clientService.switchToClient(clientId);

      state.update((s) => ({
        ...s,
        currentClient: client,
        loading: false,
      }));
    } catch (error) {
      state.update((s) => ({
        ...s,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to select client',
      }));
      throw error; // Re-throw for component error handling
    }
  },

  async refreshCurrentClient() {
    const current = get(currentClient);
    if (!current) return;

    await actions.selectClient(current.client_id);
  },
};

// Auto-initialize when in browser
if (browser) {
  actions.loadAllClients();
}

// Export the complete store interface
export const clientStore = {
  // State
  subscribe: state.subscribe,

  // Derived values
  clients,
  currentClient,
  loading,
  error,
  availableClients,
  clientsByTier,
  isClientSelected,

  // Actions
  actions,
};

// Export individual actions for convenience
export const { loadAllClients, selectClient, refreshCurrentClient } = actions;

// Export service for direct access if needed
export { clientService };
