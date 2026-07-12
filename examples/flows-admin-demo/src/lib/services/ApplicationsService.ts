import { get } from 'svelte/store';
import { reportSupabaseError } from '$lib/config/errorReporting';
import { supabaseClientStore } from '$lib/contexts/supabase-context';
import type { Application } from '$lib/types';

// Get current Supabase client from store
function getCurrentSupabaseClient() {
  const client = get(supabaseClientStore);
  if (!client) {
    throw new Error('Authentication required - please sign in to access applications data');
  }
  return client;
}

export class ApplicationsService {
  /**
   * Load applications for a specific client
   */
  static async loadApplications(clientId: string): Promise<Application[]> {
    try {
      const supabase = getCurrentSupabaseClient();
      const { data: appsData, error: appsError } = await supabase
        .from('client_applications')
        .select('*')
        .eq('client_id', clientId);

      if (appsError) {
        await reportSupabaseError('client_applications', 'select', appsError, {
          client_id: clientId,
        });
        throw appsError;
      }

      if (appsData && appsData.length > 0) {
        return ApplicationsService.transformApplications(appsData, clientId);
      }

      // Return mock applications if none found
      return ApplicationsService.createMockApplications(clientId);
    } catch (error) {
      console.error('Error loading applications:', error);
      await reportSupabaseError('client_applications', 'select', error, {
        client_id: clientId,
        operation: 'loadApplications',
      });
      throw error;
    }
  }

  /**
   * Transform database applications to UI format
   */
  private static transformApplications(appsData: any[], _clientId: string): Application[] {
    return appsData.map((app: any) => ({
      id: app.id,
      clientId: app.client_id,
      name: app.app_name,
      code: app.app_code,
      type: app.app_code.includes('offboarding') ? 'offboarding' : 'onboarding',
      status: app.status,
      version: app.app_version || '1.0.0',
      description: app.app_description,
      features: Array.isArray(app.features) ? app.features : [],
      configuration: app.configuration || {},
      permissions: app.permissions || {},
      maxConcurrentUsers: app.max_concurrent_users || 50,
      lastAccessed: app.last_accessed,
      createdAt: app.created_at,
    }));
  }

  /**
   * Create mock applications when none exist in database
   */
  private static createMockApplications(clientId: string): Application[] {
    return [
      {
        id: 'app-offboarding-001',
        clientId: clientId,
        name: 'Knowledge Transfer & Offboarding',
        code: 'knowledge-offboarding',
        type: 'offboarding',
        status: 'active',
        version: '1.8.0',
        description: 'Task-oriented employee offboarding and departure management',
        features: ['task-management', 'document-upload', 'compliance-tracking'],
        configuration: {},
        permissions: {},
        maxConcurrentUsers: 50,
        lastAccessed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      {
        id: 'app-onboarding-001',
        clientId: clientId,
        name: 'Employee Onboarding',
        code: 'employee-onboarding',
        type: 'onboarding',
        status: 'active',
        version: '2.1.0',
        description: 'Comprehensive onboarding for sustainable food technology company',
        features: ['invitation-management', 'document-collection', 'task-tracking'],
        configuration: {},
        permissions: {},
        maxConcurrentUsers: 50,
        lastAccessed: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Get application by type
   */
  static async getApplicationByType(
    clientId: string,
    type: 'onboarding' | 'offboarding'
  ): Promise<Application | null> {
    const applications = await ApplicationsService.loadApplications(clientId);
    return applications.find((app) => app.type === type) || null;
  }
}
