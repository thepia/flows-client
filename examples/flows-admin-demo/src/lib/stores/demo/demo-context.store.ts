import { derived, writable } from 'svelte/store';
import { browser } from '$app/environment';

interface DemoContext {
  isDemoMode: boolean;
  demoClient: string | null;
  demoDataGenerated: boolean;
  availableDemoClients: string[];
  productionFeatures: {
    authentication: boolean;
    realTimeData: boolean;
    fullDatasets: boolean;
  };
}

const initialState: DemoContext = {
  isDemoMode: browser ? window.location.hostname === 'localhost' : false,
  demoClient: null,
  demoDataGenerated: false,
  availableDemoClients: ['hygge-hvidlog', 'meridian-brands'],
  productionFeatures: {
    authentication: false,
    realTimeData: false,
    fullDatasets: false,
  },
};

export const demoContext = writable<DemoContext>(initialState);

// Derived stores for conditional logic
export const isDemoMode = derived(demoContext, ($ctx) => $ctx.isDemoMode);
export const shouldShowDemoFeatures = derived(
  demoContext,
  ($ctx) => $ctx.isDemoMode || $ctx.demoClient !== null
);
export const shouldGenerateDemoData = derived(
  demoContext,
  ($ctx) => $ctx.isDemoMode && !$ctx.demoDataGenerated
);

// Actions that affect both demo and production
export const demoActions = {
  switchToProduction() {
    demoContext.update((ctx) => ({
      ...ctx,
      isDemoMode: false,
      productionFeatures: {
        authentication: true,
        realTimeData: true,
        fullDatasets: true,
      },
    }));
  },

  enableDemoMode(clientId: string) {
    demoContext.update((ctx) => ({
      ...ctx,
      isDemoMode: true,
      demoClient: clientId,
      demoDataGenerated: false,
    }));
  },
};
