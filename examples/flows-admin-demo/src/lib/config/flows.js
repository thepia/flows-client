/**
 * Flows configuration for admin demo
 */

import { createFlowsSupabaseConfig } from '@thepia/flows-client';

// Create flows configuration with demo settings
export const flowsConfig = createFlowsSupabaseConfig({
  defaultClientId: 'hygge-hvidlog',
  debug: true
});

export default flowsConfig;
