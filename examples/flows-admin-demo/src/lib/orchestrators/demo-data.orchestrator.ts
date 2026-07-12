import { get } from 'svelte/store';
import { loadingProgress } from '$lib/stores/data';
import { clientStore } from '$lib/stores/domains/client/client.store';
import { tfcStore } from '$lib/stores/domains/tfc/tfc.store';

/**
 * Orchestrator pattern: Coordinates multiple domains for complex operations
 * Unlike pure services, orchestrators can:
 * - Know about multiple domains
 * - Handle UI feedback (loading, progress)
 * - Coordinate demo-specific logic
 * - Bridge demo and production concerns
 */
export class DemoDataOrchestrator {
  async setupDemoEnvironment(clientCode: string) {
    // This is demo-specific but needs to coordinate multiple domains
    const steps = [
      { name: 'Loading client data', action: () => this.setupClient(clientCode) },
      { name: 'Generating people data', action: () => this.generatePeopleData(clientCode) },
      { name: 'Setting up TFC data', action: () => this.setupTFCData(clientCode) },
      { name: 'Creating process data', action: () => this.generateProcessData(clientCode) },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Update UI progress (orchestrator concern)
      loadingProgress.set({
        stage: step.name,
        current: i + 1,
        total: steps.length,
        message: `${step.name}...`,
      });

      try {
        await step.action();
      } catch (error) {
        // Orchestrator handles cross-domain errors
        this.handleSetupError(step.name, error);
        throw error;
      }
    }
  }

  private async setupClient(clientCode: string) {
    // Coordinate with client domain
    const clients = get(clientStore.clients);
    const client = clients.find((c) => c.client_code === clientCode);

    if (client) {
      await clientStore.actions.selectClient(client.client_id);
    } else {
      throw new Error(`Demo client ${clientCode} not found`);
    }
  }

  private async setupTFCData(_clientCode: string) {
    const currentClient = get(clientStore.currentClient);
    if (!currentClient) throw new Error('No client selected');

    // Coordinate TFC domain setup
    await tfcStore.actions.loadTFCData(currentClient.client_id);
  }

  private async generatePeopleData(clientCode: string) {
    // This would coordinate with people domain when we create it
    // For now, delegate to existing demo generation
    const { generateDemoData } = await import('$lib/services/demoDataGenerator');
    await generateDemoData('people', { clientCode, count: 50 });
  }

  private async generateProcessData(clientCode: string) {
    const { generateDemoData } = await import('$lib/services/demoDataGenerator');
    await generateDemoData('processes', { clientCode, count: 25 });
  }

  private handleSetupError(step: string, error: unknown) {
    console.error(`Demo setup failed at step: ${step}`, error);

    // Orchestrator can make decisions about error handling
    if (step.includes('TFC') && error instanceof Error && error.message.includes('not found')) {
      console.warn('TFC data not available, continuing without it');
      return; // Continue setup
    }

    // For other errors, let them bubble up
    throw error;
  }
}
