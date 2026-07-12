/**
 * Store Diagnostics - Debug helper to understand store behavior
 */

import { get, writable } from 'svelte/store';
import { applications } from '$lib/stores/data';

// Diagnostic state
export const diagnostics = writable({
  storeSubscriptions: [] as any[],
  reactiveStatements: [] as any[],
  storeValues: [] as any[],
  timestamps: [] as any[],
});

// Store subscription tracker
export function trackStoreSubscription(storeName: string, value: any) {
  const timestamp = new Date().toISOString();
  diagnostics.update((d) => ({
    ...d,
    storeSubscriptions: [...d.storeSubscriptions, { storeName, value, timestamp }],
  }));
  console.log(`📊 [Diagnostics] ${storeName} subscription:`, value, 'at', timestamp);
}

// Reactive statement tracker
export function trackReactiveStatement(statementName: string, value: any) {
  const timestamp = new Date().toISOString();
  diagnostics.update((d) => ({
    ...d,
    reactiveStatements: [...d.reactiveStatements, { statementName, value, timestamp }],
  }));
  console.log(`🔄 [Diagnostics] ${statementName} reactive:`, value, 'at', timestamp);
}

// Store value tracker
export function trackStoreValue(storeName: string) {
  const value = get(applications);
  const timestamp = new Date().toISOString();
  diagnostics.update((d) => ({
    ...d,
    storeValues: [...d.storeValues, { storeName, value, timestamp }],
  }));
  console.log(`📦 [Diagnostics] ${storeName} current value:`, value, 'at', timestamp);
  return value;
}

// Initialize store monitoring
export function initializeStoreDiagnostics() {
  console.log('🚀 [Diagnostics] Initializing store diagnostics');

  // Monitor applications store
  applications.subscribe((value) => {
    trackStoreSubscription('applications', value);
  });

  // Periodic value checks
  const intervalId = setInterval(() => {
    trackStoreValue('applications');
  }, 1000);

  // Cleanup after 30 seconds
  setTimeout(() => {
    clearInterval(intervalId);
    console.log('🛑 [Diagnostics] Stopping periodic checks');
  }, 30000);

  return () => clearInterval(intervalId);
}

// Test applications store behavior
export async function testApplicationsStore() {
  console.log('🧪 [Test] Starting applications store test');

  const initialValue = get(applications);
  console.log('🧪 [Test] Initial applications value:', initialValue);

  return new Promise((resolve) => {
    const unsubscribe = applications.subscribe((value) => {
      console.log('🧪 [Test] Applications store changed to:', value);
      if (value && value.length > 0) {
        console.log('🧪 [Test] Applications loaded successfully:', value.length, 'items');
        unsubscribe();
        resolve(value);
      }
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      unsubscribe();
      const finalValue = get(applications);
      console.log('🧪 [Test] Timeout reached. Final value:', finalValue);
      resolve(finalValue);
    }, 10000);
  });
}
