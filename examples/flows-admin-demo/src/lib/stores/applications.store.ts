import { derived, writable } from 'svelte/store';
import { ApplicationsService } from '$lib/services/ApplicationsService';
import type { Application } from '$lib/types';

// Core application state
export const applications = writable<Application[]>([]);
export const applicationsLoading = writable<boolean>(false);
export const applicationsError = writable<string | null>(null);

// Derived state for UI
export const applicationsLoaded = derived(
  applications,
  ($applications) => Array.isArray($applications) && $applications.length > 0
);

export const applicationsByType = derived(applications, ($applications) => ({
  onboarding: $applications.filter((app) => app.type === 'onboarding'),
  offboarding: $applications.filter((app) => app.type === 'offboarding'),
}));

/**
 * Applications store actions
 */
export const applicationsActions = {
  /**
   * Load applications for a client
   */
  async loadApplications(clientId: string) {
    applicationsLoading.set(true);
    applicationsError.set(null);

    try {
      const apps = await ApplicationsService.loadApplications(clientId);
      applications.set(apps);
      console.log('📱 Applications loaded:', apps.length, 'applications');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load applications';
      applicationsError.set(errorMessage);
      console.error('Error loading applications:', error);
    } finally {
      applicationsLoading.set(false);
    }
  },

  /**
   * Find application by code
   */
  findByCode(code: string): Application | null {
    let result: Application | null = null;
    applications.subscribe((apps) => {
      result = apps.find((app) => app.code === code) || null;
    })();
    return result;
  },

  /**
   * Get application by type
   */
  async getByType(
    clientId: string,
    type: 'onboarding' | 'offboarding'
  ): Promise<Application | null> {
    return ApplicationsService.getApplicationByType(clientId, type);
  },

  /**
   * Clear applications state
   */
  clear() {
    applications.set([]);
    applicationsError.set(null);
  },
};
