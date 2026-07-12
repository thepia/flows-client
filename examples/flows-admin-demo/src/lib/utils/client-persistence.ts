/**
 * Ultra-simple localStorage-based client persistence
 * Single source of truth for current client selection
 * Uses the existing settings system for consistency
 */

import { LocalStorageManager } from './localStorage';

const DEFAULT_CLIENT_ID = 'hygge-hvidlog';

/**
 * Get current client ID from localStorage
 * If not set, sets default and returns it
 */
export function getCurrentClientId(): string {
  if (typeof window === 'undefined') {
    return DEFAULT_CLIENT_ID;
  }

  try {
    // Try to get from localStorage directly first
    const settingsStr = localStorage.getItem('flows-admin-demo-settings');
    if (settingsStr) {
      try {
        const settings = JSON.parse(settingsStr);
        if (settings.selectedClient && typeof settings.selectedClient === 'string') {
          return settings.selectedClient;
        }
      } catch (_e) {
        console.warn('Failed to parse settings, using default client');
      }
    }

    // If no valid client found, use default
    console.log(`No client found in localStorage, using default: ${DEFAULT_CLIENT_ID}`);

    // Save the default for next time
    try {
      const updatedSettings = LocalStorageManager.mergeWithDefaults({
        selectedClient: DEFAULT_CLIENT_ID,
      });
      LocalStorageManager.saveSettings(updatedSettings);
    } catch (saveError) {
      console.error('Failed to save default client:', saveError);
    }

    return DEFAULT_CLIENT_ID;
  } catch (error) {
    console.error('Error accessing localStorage:', error);
    return DEFAULT_CLIENT_ID;
  }
}

/**
 * Set current client ID in localStorage
 * ONLY called when user actively selects a different client
 */
export function setCurrentClientId(clientId: string): void {
  if (typeof window === 'undefined') return;

  const currentSettings =
    LocalStorageManager.loadSettings() || LocalStorageManager.getDefaultSettings();
  const updatedSettings = {
    ...currentSettings,
    selectedClient: clientId,
    lastUpdated: new Date().toISOString(),
  };
  LocalStorageManager.saveSettings(updatedSettings);
}

/**
 * Clear stored client selection
 */
export function clearCurrentClientId(): void {
  if (typeof window === 'undefined') return;
  LocalStorageManager.clearSettings();
}
