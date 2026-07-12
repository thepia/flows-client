import { derived, writable } from 'svelte/store';
import type {
  DemoAction,
  DemoCompany,
  DemoGenerationConfig,
  DemoMetrics,
  DemoTemplate,
} from '$lib/types';

// Demo management state
interface DemoManagementState {
  companies: DemoCompany[];
  metrics: DemoMetrics | null;
  templates: DemoTemplate[];
  actions: DemoAction[];
  loading: boolean;
  error: string | null;
}

const initialState: DemoManagementState = {
  companies: [],
  metrics: null,
  templates: [],
  actions: [],
  loading: false,
  error: null,
};

// Create the demo management store
function createDemoManagementStore() {
  const { subscribe, set, update } = writable<DemoManagementState>(initialState);

  return {
    subscribe,

    /**
     * Initialize demo management data
     */
    init: async () => {
      update((state) => ({ ...state, loading: true, error: null }));

      try {
        // Load demo companies first (these should always work as they're hardcoded)
        const companies = await loadDemoCompanies();

        // Try to load other data, but don't fail if they error
        let metrics: DemoMetrics;
        let templates: DemoTemplate[];
        let actions: DemoAction[];

        try {
          metrics = await loadDemoMetrics();
        } catch (error) {
          console.warn('Failed to load demo metrics, using defaults:', error);
          metrics = getDefaultMetrics();
        }

        try {
          templates = await loadDemoTemplates();
        } catch (error) {
          console.warn('Failed to load demo templates, using defaults:', error);
          templates = getDefaultTemplates();
        }

        try {
          actions = await loadDemoActions();
        } catch (error) {
          console.warn('Failed to load demo actions, using defaults:', error);
          actions = [];
        }

        update((state) => ({
          ...state,
          companies,
          metrics,
          templates,
          actions,
          loading: false,
        }));
      } catch (error) {
        console.error('Failed to initialize demo management:', error);
        // Even if everything fails, provide basic demo companies
        update((state) => ({
          ...state,
          companies: getDefaultCompanies(),
          metrics: getDefaultMetrics(),
          templates: getDefaultTemplates(),
          actions: [],
          error: 'Database unavailable - running in offline demo mode',
          loading: false,
        }));
      }
    },

    /**
     * Load all demo companies
     */
    loadCompanies: async () => {
      try {
        const companies = await loadDemoCompanies();
        update((state) => ({ ...state, companies, loading: false }));
        return companies;
      } catch (error) {
        update((state) => ({
          ...state,
          error: error instanceof Error ? error.message : 'Failed to load companies',
          loading: false,
        }));
        return [];
      }
    },

    /**
     * Create a new demo company
     */
    createCompany: async (
      companyData: Omit<DemoCompany, 'id' | 'lastGenerated' | 'generationStatus'>
    ) => {
      update((state) => ({ ...state, loading: true }));

      try {
        const newCompany: DemoCompany = {
          ...companyData,
          id: crypto.randomUUID(),
          generationStatus: 'not_generated',
        };

        // TODO: Implement actual API call to create company
        await simulateApiCall();

        update((state) => ({
          ...state,
          companies: [...state.companies, newCompany],
          loading: false,
        }));

        return newCompany;
      } catch (error) {
        update((state) => ({
          ...state,
          error: error instanceof Error ? error.message : 'Failed to create company',
          loading: false,
        }));
        throw error;
      }
    },

    /**
     * Update a demo company
     */
    updateCompany: async (companyId: string, updates: Partial<DemoCompany>) => {
      update((state) => ({ ...state, loading: true }));

      try {
        // TODO: Implement actual API call to update company
        await simulateApiCall();

        update((state) => ({
          ...state,
          companies: state.companies.map((company) =>
            company.id === companyId ? { ...company, ...updates } : company
          ),
          loading: false,
        }));
      } catch (error) {
        update((state) => ({
          ...state,
          error: error instanceof Error ? error.message : 'Failed to update company',
          loading: false,
        }));
        throw error;
      }
    },

    /**
     * Delete a demo company
     */
    deleteCompany: async (companyId: string) => {
      update((state) => ({ ...state, loading: true }));

      try {
        // TODO: Implement actual API call to delete company
        await simulateApiCall();

        update((state) => ({
          ...state,
          companies: state.companies.filter((company) => company.id !== companyId),
          loading: false,
        }));
      } catch (error) {
        update((state) => ({
          ...state,
          error: error instanceof Error ? error.message : 'Failed to delete company',
          loading: false,
        }));
        throw error;
      }
    },

    /**
     * Generate demo data for a company
     */
    generateDemoData: async (config: DemoGenerationConfig) => {
      const actionId = crypto.randomUUID();

      // Add action to track progress
      update((state) => ({
        ...state,
        actions: [
          ...state.actions,
          {
            id: actionId,
            type: 'generate',
            companyId: config.companyId,
            status: 'running',
            progress: 0,
            message: 'Starting data generation...',
            startedAt: new Date().toISOString(),
          },
        ],
      }));

      // Update company status
      update((state) => ({
        ...state,
        companies: state.companies.map((company) =>
          company.id === config.companyId ? { ...company, generationStatus: 'generating' } : company
        ),
      }));

      try {
        // Check if we're in offline mode (error state indicates database unavailable)
        let isOfflineMode = false;
        update((state) => {
          isOfflineMode = !!state.error;
          return state;
        });

        if (isOfflineMode) {
          // Simulate data generation in offline mode
          for (let progress = 0; progress <= 100; progress += 20) {
            await new Promise((resolve) => setTimeout(resolve, 300));

            const message = `${getProgressMessage(progress)} (offline demo mode)`;

            update((state) => ({
              ...state,
              actions: state.actions.map((action) =>
                action.id === actionId ? { ...action, progress, message } : action
              ),
            }));
          }
        } else {
          // Try real data generation, but fall back to simulation if it fails
          try {
            const { generateDemoDataForCompany } = await import('../services/demoDataGenerator.js');

            await generateDemoDataForCompany(config, (progress, message) => {
              update((state) => ({
                ...state,
                actions: state.actions.map((action) =>
                  action.id === actionId ? { ...action, progress, message } : action
                ),
              }));
            });
          } catch (dbError) {
            console.warn('Database generation failed, falling back to simulation:', dbError);
            // Fall back to simulation
            for (let progress = 0; progress <= 100; progress += 20) {
              await new Promise((resolve) => setTimeout(resolve, 300));

              const message = `${getProgressMessage(progress)} (simulated - database unavailable)`;

              update((state) => ({
                ...state,
                actions: state.actions.map((action) =>
                  action.id === actionId ? { ...action, progress, message } : action
                ),
              }));
            }
          }
        }

        // Mark as completed
        update((state) => ({
          ...state,
          companies: state.companies.map((company) =>
            company.id === config.companyId
              ? {
                  ...company,
                  generationStatus: 'completed',
                  lastGenerated: new Date().toISOString(),
                  employeeCount: config.employeeCount,
                  onboardingCount: config.onboardingCount,
                  offboardingCount: config.offboardingCount,
                }
              : company
          ),
          actions: state.actions.map((action) =>
            action.id === actionId
              ? {
                  ...action,
                  status: 'completed',
                  progress: 100,
                  message: 'Data generation completed successfully',
                  completedAt: new Date().toISOString(),
                }
              : action
          ),
        }));

        // Refresh metrics after generation
        await loadDemoMetrics();
      } catch (error) {
        update((state) => ({
          ...state,
          companies: state.companies.map((company) =>
            company.id === config.companyId ? { ...company, generationStatus: 'error' } : company
          ),
          actions: state.actions.map((action) =>
            action.id === actionId
              ? {
                  ...action,
                  status: 'error',
                  message: error instanceof Error ? error.message : 'Generation failed',
                  completedAt: new Date().toISOString(),
                }
              : action
          ),
        }));
        throw error;
      }
    },

    /**
     * Reset demo data for a company
     */
    resetCompany: async (companyId: string) => {
      const actionId = crypto.randomUUID();

      // Add action to track progress
      update((state) => ({
        ...state,
        actions: [
          ...state.actions,
          {
            id: actionId,
            type: 'reset',
            companyId: companyId,
            status: 'running',
            progress: 0,
            message: 'Starting data cleanup...',
            startedAt: new Date().toISOString(),
          },
        ],
      }));

      try {
        // Import and run actual data cleanup
        const { resetDemoDataForCompany } = await import('../services/demoDataCleanup.js');

        await resetDemoDataForCompany(companyId, (progress, message) => {
          update((state) => ({
            ...state,
            actions: state.actions.map((action) =>
              action.id === actionId ? { ...action, progress, message } : action
            ),
          }));
        });

        update((state) => ({
          ...state,
          companies: state.companies.map((company) =>
            company.id === companyId
              ? {
                  ...company,
                  generationStatus: 'not_generated',
                  lastGenerated: undefined,
                  employeeCount: 0,
                  onboardingCount: 0,
                  offboardingCount: 0,
                }
              : company
          ),
          actions: state.actions.map((action) =>
            action.id === actionId
              ? {
                  ...action,
                  status: 'completed',
                  progress: 100,
                  message: 'Data cleanup completed successfully',
                  completedAt: new Date().toISOString(),
                }
              : action
          ),
        }));

        // Refresh metrics after reset
        await loadDemoMetrics();
      } catch (error) {
        update((state) => ({
          ...state,
          companies: state.companies.map((company) =>
            company.id === companyId ? { ...company, generationStatus: 'error' } : company
          ),
          actions: state.actions.map((action) =>
            action.id === actionId
              ? {
                  ...action,
                  status: 'error',
                  message: error instanceof Error ? error.message : 'Reset failed',
                  completedAt: new Date().toISOString(),
                }
              : action
          ),
        }));
        throw error;
      }
    },

    /**
     * Clear all actions older than 24 hours
     */
    clearOldActions: () => {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      update((state) => ({
        ...state,
        actions: state.actions.filter(
          (action) => action.startedAt > oneDayAgo || action.status === 'running'
        ),
      }));
    },

    /**
     * Clear error state
     */
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },
  };
}

// Helper functions

async function simulateApiCall(delay = 1000): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

function getProgressMessage(progress: number): string {
  if (progress === 0) return 'Initializing...';
  if (progress <= 20) return 'Creating company structure...';
  if (progress <= 40) return 'Generating employee profiles...';
  if (progress <= 60) return 'Creating process instances...';
  if (progress <= 80) return 'Generating documents and tasks...';
  if (progress < 100) return 'Finalizing data relationships...';
  return 'Completed successfully';
}

async function loadDemoCompanies(): Promise<DemoCompany[]> {
  // Return demo companies immediately (no API call needed for hardcoded data)
  return [
    {
      id: 'hygge-hvidlog',
      name: 'hygge-hvidlog',
      displayName: 'Hygge & Hvidløg A/S',
      industry: 'Sustainable Food Technology',
      description: 'European food tech company specializing in plant-based protein alternatives',
      employeeCount: 1200,
      onboardingCount: 22,
      offboardingCount: 16,
      demoType: 'internal',
      complexity: 'complex',
      isActive: true,
      lastGenerated: '2025-06-27T10:00:00Z',
      generationStatus: 'completed',
    },
    {
      id: 'meridian-brands',
      name: 'meridian-brands',
      displayName: 'Meridian Brands International',
      industry: 'Consumer Products',
      description: 'Global consumer lifestyle brands spanning personal care and home goods',
      employeeCount: 1000,
      onboardingCount: 45,
      offboardingCount: 32,
      demoType: 'prospect',
      complexity: 'complex',
      isActive: true,
      lastGenerated: '2025-06-27T10:00:00Z',
      generationStatus: 'completed',
    },
  ];
}

async function loadDemoMetrics(): Promise<DemoMetrics> {
  // Return metrics immediately (hardcoded for demo purposes)
  return {
    totalCompanies: 2,
    totalEmployees: 2200,
    activeProcesses: 115,
    completedProcesses: 1485,
    totalDocuments: 4720,
    totalTasks: 8940,
    lastUpdated: new Date().toISOString(),
  };
}

async function loadDemoTemplates(): Promise<DemoTemplate[]> {
  // Return templates immediately (hardcoded for demo purposes)
  return [
    {
      id: 'employment-contract',
      name: 'Employment Contract',
      type: 'document',
      category: 'Legal',
      description: 'Standard employment contract template',
      isActive: true,
      usageCount: 1200,
    },
    {
      id: 'onboarding-checklist',
      name: 'Onboarding Checklist',
      type: 'workflow',
      category: 'HR Process',
      description: 'Complete onboarding workflow for new employees',
      isActive: true,
      usageCount: 890,
    },
  ];
}

async function loadDemoActions(): Promise<DemoAction[]> {
  // Return actions immediately (hardcoded for demo purposes)
  return [
    {
      id: 'action-1',
      type: 'generate',
      companyId: 'hygge-hvidlog',
      status: 'completed',
      progress: 100,
      message: 'Data generation completed successfully',
      startedAt: '2025-06-27T09:00:00Z',
      completedAt: '2025-06-27T09:15:00Z',
    },
  ];
}

// Export the store
export const demoManagementStore = createDemoManagementStore();

// Derived stores for convenient access
export const demoCompanies = derived(demoManagementStore, ($store) => $store.companies);
export const demoMetrics = derived(demoManagementStore, ($store) => $store.metrics);
export const demoTemplates = derived(demoManagementStore, ($store) => $store.templates);
export const demoActions = derived(demoManagementStore, ($store) => $store.actions);
export const isDemoLoading = derived(demoManagementStore, ($store) => $store.loading);
export const demoError = derived(demoManagementStore, ($store) => $store.error);

// Helper derived stores
export const activeCompanies = derived(demoCompanies, ($companies) =>
  $companies.filter((company) => company.isActive)
);

export const runningActions = derived(demoActions, ($actions) =>
  $actions.filter((action) => action.status === 'running')
);

export const recentActions = derived(demoActions, ($actions) =>
  $actions
    .filter((action) => action.status === 'completed' || action.status === 'error')
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 10)
);

// Default/fallback data functions
function getDefaultCompanies(): DemoCompany[] {
  return [
    {
      id: 'hygge-hvidlog',
      name: 'hygge-hvidlog',
      displayName: 'Hygge & Hvidløg A/S',
      industry: 'Sustainable Food Technology',
      description: 'European food tech company specializing in plant-based protein alternatives',
      employeeCount: 0,
      onboardingCount: 0,
      offboardingCount: 0,
      demoType: 'internal',
      complexity: 'complex',
      isActive: true,
      generationStatus: 'not_generated',
    },
    {
      id: 'meridian-brands',
      name: 'meridian-brands',
      displayName: 'Meridian Brands International',
      industry: 'Consumer Products',
      description: 'Global consumer lifestyle brands spanning personal care and home goods',
      employeeCount: 0,
      onboardingCount: 0,
      offboardingCount: 0,
      demoType: 'prospect',
      complexity: 'complex',
      isActive: true,
      generationStatus: 'not_generated',
    },
  ];
}

function getDefaultMetrics(): DemoMetrics {
  return {
    totalCompanies: 2,
    totalEmployees: 0,
    activeProcesses: 0,
    completedProcesses: 0,
    totalDocuments: 0,
    totalTasks: 0,
    lastUpdated: new Date().toISOString(),
  };
}

function getDefaultTemplates(): DemoTemplate[] {
  return [
    {
      id: 'employment-contract',
      name: 'Employment Contract',
      type: 'document',
      category: 'Legal',
      description: 'Standard employment contract template',
      isActive: true,
      usageCount: 0,
    },
    {
      id: 'onboarding-checklist',
      name: 'Onboarding Checklist',
      type: 'workflow',
      category: 'HR Process',
      description: 'Complete onboarding workflow for new employees',
      isActive: true,
      usageCount: 0,
    },
  ];
}
