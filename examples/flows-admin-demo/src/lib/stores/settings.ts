import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';
import { applyBrandingToDocument, getBrandingById } from '$lib/services/brandingRegistry';
import type { BrandingConfig, Client, DemoSettings, SettingsState } from '$lib/types';
import { LocalStorageManager } from '$lib/utils/localStorage';

// Create the settings store
function createSettingsStore() {
  const initialState: SettingsState = {
    settings: LocalStorageManager.getDefaultSettings(),
    loading: false,
    error: null,
  };

  const { subscribe, set, update } = writable<SettingsState>(initialState);

  return {
    subscribe,

    /**
     * Initialize settings from localStorage
     */
    init: () => {
      if (!browser || !LocalStorageManager.isSupported()) {
        console.warn('localStorage not supported, using default settings');
        return;
      }

      update((state) => ({ ...state, loading: true }));

      try {
        const storedSettings = LocalStorageManager.loadSettings();

        if (storedSettings) {
          update((state) => ({
            ...state,
            settings: storedSettings,
            loading: false,
            error: null,
          }));
        } else {
          // No stored settings, use defaults and save them
          const defaultSettings = LocalStorageManager.getDefaultSettings();
          LocalStorageManager.saveSettings(defaultSettings);

          update((state) => ({
            ...state,
            settings: defaultSettings,
            loading: false,
            error: null,
          }));
        }
      } catch (error) {
        console.error('Failed to initialize settings:', error);
        update((state) => ({
          ...state,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },

    /**
     * Update branding selection
     */
    selectBranding: async (brandingId: string) => {
      update((state) => {
        const newSettings = {
          ...state.settings,
          selectedBranding: brandingId,
        };

        if (browser) {
          LocalStorageManager.saveSettings(newSettings);
        }

        return {
          ...state,
          settings: newSettings,
          error: null,
        };
      });

      // Apply branding to document
      if (browser) {
        const brandingConfig = getBrandingById(brandingId);
        if (brandingConfig) {
          applyBrandingToDocument(brandingConfig);
        }
      }
    },

    /**
     * Update client selection
     */
    selectClient: (clientId: string) => {
      update((state) => {
        const newSettings = {
          ...state.settings,
          selectedClient: clientId,
        };

        if (browser) {
          LocalStorageManager.saveSettings(newSettings);
        }

        return {
          ...state,
          settings: newSettings,
          error: null,
        };
      });
    },

    /**
     * Toggle real clients access
     */
    toggleRealClients: (allow: boolean) => {
      update((state) => {
        const newSettings = {
          ...state.settings,
          allowRealClients: allow,
        };

        if (browser) {
          LocalStorageManager.saveSettings(newSettings);
        }

        return {
          ...state,
          settings: newSettings,
          error: null,
        };
      });
    },

    /**
     * Add a new branding configuration
     */
    addBranding: (branding: BrandingConfig) => {
      update((state) => {
        const existingIndex = state.settings.availableBrandings.findIndex(
          (b) => b.id === branding.id
        );
        const newBrandings = [...state.settings.availableBrandings];

        if (existingIndex >= 0) {
          newBrandings[existingIndex] = branding;
        } else {
          newBrandings.push(branding);
        }

        const newSettings = {
          ...state.settings,
          availableBrandings: newBrandings,
        };

        if (browser) {
          LocalStorageManager.saveSettings(newSettings);
        }

        return {
          ...state,
          settings: newSettings,
          error: null,
        };
      });
    },

    /**
     * Remove a branding configuration
     */
    removeBranding: (brandingId: string) => {
      update((state) => {
        const newBrandings = state.settings.availableBrandings.filter((b) => b.id !== brandingId);

        // If removing the currently selected branding, switch to default
        let selectedBranding = state.settings.selectedBranding;
        if (selectedBranding === brandingId) {
          const defaultBranding = newBrandings.find((b) => b.isDefault);
          selectedBranding = defaultBranding?.id || newBrandings[0]?.id || '';
        }

        const newSettings = {
          ...state.settings,
          availableBrandings: newBrandings,
          selectedBranding,
        };

        if (browser) {
          LocalStorageManager.saveSettings(newSettings);
        }

        return {
          ...state,
          settings: newSettings,
          error: null,
        };
      });
    },

    /**
     * Reset to default settings
     */
    reset: () => {
      const defaultSettings = LocalStorageManager.getDefaultSettings();

      if (browser) {
        LocalStorageManager.saveSettings(defaultSettings);
      }

      update((state) => ({
        ...state,
        settings: defaultSettings,
        error: null,
      }));
    },

    /**
     * Clear error state
     */
    clearError: () => {
      update((state) => ({
        ...state,
        error: null,
      }));
    },
  };
}

// Export the store instance
export const settingsStore = createSettingsStore();

// Derived stores for convenient access
export const settings = derived(settingsStore, ($store) => $store.settings);
export const selectedBranding = derived(settings, ($settings) =>
  $settings.availableBrandings.find((b) => b.id === $settings.selectedBranding)
);
export const isSettingsLoading = derived(settingsStore, ($store) => $store.loading);
export const settingsError = derived(settingsStore, ($store) => $store.error);

// Helper function to get available clients based on settings
export function getAvailableClients(allClients: Client[], settings: DemoSettings): Client[] {
  if (settings.allowRealClients) {
    return allClients;
  }

  // Filter to only demo/test clients and the specific detailed demo companies
  return allClients.filter(
    (client) =>
      client.name.toLowerCase().includes('demo') ||
      client.name.toLowerCase().includes('test') ||
      client.code.toLowerCase().includes('demo') ||
      client.code.toLowerCase().includes('test') ||
      // Include the specific detailed demo companies
      client.code === 'hygge-hvidlog' ||
      client.code === 'meridian-brands'
  );
}
