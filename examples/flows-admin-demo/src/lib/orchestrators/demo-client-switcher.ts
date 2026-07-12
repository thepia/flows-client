import { get } from 'svelte/store';
import { loadingProgress } from '$lib/stores/data';
import { clientStore } from '$lib/stores/domains/client/client.store';
import { tfcStore } from '$lib/stores/domains/tfc/tfc.store';

/**
 * Central orchestrator for demo client switching
 * Coordinates data switching across all domains when demo client changes
 */
export class DemoClientSwitcher {
  private isDemo: boolean = false;
  private currentSwitchPromise: Promise<void> | null = null;

  constructor() {
    // Detect if we're in demo mode
    this.isDemo = this.detectDemoMode();
  }

  /**
   * Switch to a different demo client with full data coordination
   */
  async switchDemoClient(clientId: string): Promise<void> {
    // Prevent concurrent switches
    if (this.currentSwitchPromise) {
      console.warn('[DemoClientSwitcher] Switch already in progress, waiting...');
      await this.currentSwitchPromise;
    }

    this.currentSwitchPromise = this.performClientSwitch(clientId);

    try {
      await this.currentSwitchPromise;
    } finally {
      this.currentSwitchPromise = null;
    }
  }

  /**
   * Perform the actual client switch with coordinated data loading
   */
  private async performClientSwitch(clientId: string): Promise<void> {
    console.log(`[DemoClientSwitcher] Starting switch to client: ${clientId}`);

    // Define all domains that need to be updated
    const switchSteps = [
      {
        name: 'Switching client context',
        action: () => this.switchClientContext(clientId),
      },
      {
        name: 'Loading TFC data',
        action: () => this.loadTFCData(clientId),
      },
      {
        name: 'Loading people data',
        action: () => this.loadPeopleData(clientId),
      },
      {
        name: 'Loading process data',
        action: () => this.loadProcessData(clientId),
      },
      {
        name: 'Loading invitation data',
        action: () => this.loadInvitationData(clientId),
      },
    ];

    // Execute steps with progress feedback
    for (let i = 0; i < switchSteps.length; i++) {
      const step = switchSteps[i];

      // Update global progress state
      loadingProgress.set({
        stage: step.name,
        current: i + 1,
        total: switchSteps.length,
        message: `${step.name} for new client...`,
      });

      try {
        await step.action();
        console.log(`[DemoClientSwitcher] ✅ ${step.name} completed`);
      } catch (error) {
        console.error(`[DemoClientSwitcher] ❌ ${step.name} failed:`, error);

        // For demo mode, log errors but continue (graceful degradation)
        if (this.isDemo) {
          console.warn(`[DemoClientSwitcher] Continuing despite error in demo mode`);
        } else {
          throw error; // In production, fail fast
        }
      }
    }

    // Clear loading state
    loadingProgress.set({
      stage: '',
      current: 0,
      total: 0,
      message: '',
    });

    console.log(`[DemoClientSwitcher] ✅ Client switch to ${clientId} completed`);
  }

  /**
   * Switch the client context using the client store
   */
  private async switchClientContext(clientId: string): Promise<void> {
    await clientStore.actions.selectClient(clientId);

    // Verify the switch was successful
    const currentClient = get(clientStore.currentClient);
    if (!currentClient || currentClient.client_id !== clientId) {
      throw new Error(`Failed to switch to client ${clientId}`);
    }

    // Give the store bridge a moment to synchronize
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  /**
   * Load TFC data for the new client
   */
  private async loadTFCData(clientId: string): Promise<void> {
    try {
      await tfcStore.actions.loadTFCData(clientId);
    } catch (error) {
      // TFC data might not exist for all demo clients
      console.warn(`[DemoClientSwitcher] TFC data not available for ${clientId}:`, error);
    }
  }

  /**
   * Load people data for the new client
   */
  private async loadPeopleData(clientId: string): Promise<void> {
    try {
      // When we create the people domain store, we'll use it here
      // For now, delegate to legacy data loading
      const { loadClientData } = await import('$lib/stores/data');
      await loadClientData(clientId);
    } catch (error) {
      console.warn(`[DemoClientSwitcher] People data loading failed for ${clientId}:`, error);
    }
  }

  /**
   * Load process data for the new client
   */
  private async loadProcessData(clientId: string): Promise<void> {
    try {
      // When we create the process domain store, we'll use it here
      // For now, this is handled by the main page component
      console.log(
        `[DemoClientSwitcher] Process data will be loaded by main component for ${clientId}`
      );
    } catch (error) {
      console.warn(`[DemoClientSwitcher] Process data loading failed for ${clientId}:`, error);
    }
  }

  /**
   * Load invitation data for the new client
   */
  private async loadInvitationData(clientId: string): Promise<void> {
    try {
      // When we create the invitation domain store, we'll use it here
      // For now, this is handled by the invitations page component
      console.log(
        `[DemoClientSwitcher] Invitation data will be loaded by invitation component for ${clientId}`
      );
    } catch (error) {
      console.warn(`[DemoClientSwitcher] Invitation data loading failed for ${clientId}:`, error);
    }
  }

  /**
   * Detect if we're in demo mode
   */
  private detectDemoMode(): boolean {
    if (typeof window === 'undefined') return false;

    const hostname = window.location.hostname;
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1';
    const isDemo = hostname.includes('demo') || window.location.search.includes('demo=true');

    return isDev || isDemo;
  }

  /**
   * Get current client ID
   */
  getCurrentClientId(): string | null {
    const currentClient = get(clientStore.currentClient);
    return currentClient?.client_id || null;
  }

  /**
   * Check if a client switch is in progress
   */
  isSwitching(): boolean {
    return this.currentSwitchPromise !== null;
  }

  /**
   * Get available demo clients
   */
  async getAvailableClients() {
    const clients = get(clientStore.clients);

    // If no clients loaded yet, trigger loading
    if (!clients || clients.length === 0) {
      await clientStore.actions.loadAllClients();
      return get(clientStore.clients);
    }

    return clients;
  }
}

// Singleton instance for global coordination
export const demoClientSwitcher = new DemoClientSwitcher();

// Convenience functions
export const switchDemoClient = (clientId: string) => demoClientSwitcher.switchDemoClient(clientId);
export const getCurrentClientId = () => demoClientSwitcher.getCurrentClientId();
export const isSwitchingClient = () => demoClientSwitcher.isSwitching();
