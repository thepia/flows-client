<!--
  Applications Store Debugger Component
  This component helps diagnose store behavior issues
-->
<script lang="ts">
import { onMount } from 'svelte';
import { applications } from '$lib/stores/data';
import { initializeStoreDiagnostics, testApplicationsStore } from './store-diagnostics';

let debugInfo = {
  storeValue: null,
  storeLength: 0,
  subscriptionCount: 0,
  reactiveCount: 0,
  lastUpdate: null,
};

let testResults = [];

// Manual store value check
function checkStoreValue() {
  const value = $applications;
  debugInfo = {
    ...debugInfo,
    storeValue: value,
    storeLength: value?.length || 0,
    lastUpdate: new Date().toISOString(),
  };
  console.log('🔍 [Debug] Manual store check:', value);
}

// Test store subscription
function _testSubscription() {
  console.log('🧪 [Debug] Testing store subscription');
  const unsubscribe = applications.subscribe((value) => {
    console.log('🧪 [Debug] Subscription triggered:', value);
    testResults = [
      ...testResults,
      {
        type: 'subscription',
        value: value,
        timestamp: new Date().toISOString(),
      },
    ];
  });

  setTimeout(() => {
    unsubscribe();
    console.log('🧪 [Debug] Subscription test completed');
  }, 5000);
}

// Test reactive statement
$: {
  debugInfo.reactiveCount++;
  console.log('🔄 [Debug] Reactive statement triggered. Count:', debugInfo.reactiveCount);
  console.log('🔄 [Debug] Applications in reactive:', $applications);

  testResults = [
    ...testResults,
    {
      type: 'reactive',
      value: $applications,
      count: debugInfo.reactiveCount,
      timestamp: new Date().toISOString(),
    },
  ];
}

// Test store behavior on mount
onMount(async () => {
  console.log('🚀 [Debug] ApplicationsDebugger mounted');

  // Initialize diagnostics
  const cleanup = initializeStoreDiagnostics();

  // Initial store check
  checkStoreValue();

  // Test applications store
  console.log('🧪 [Debug] Running applications store test');
  const testResult = await testApplicationsStore();
  console.log('🧪 [Debug] Test completed:', testResult);

  return cleanup;
});
</script>

<div class="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
  <h3 class="text-lg font-bold mb-4">Applications Store Debugger</h3>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <!-- Store State -->
    <div class="bg-gray-800 p-3 rounded">
      <h4 class="font-bold text-yellow-400 mb-2">Store State</h4>
      <div>Value: {JSON.stringify(debugInfo.storeValue, null, 2)}</div>
      <div>Length: {debugInfo.storeLength}</div>
      <div>Last Update: {debugInfo.lastUpdate}</div>
      <div>Reactive Count: {debugInfo.reactiveCount}</div>
    </div>
    
    <!-- Test Results -->
    <div class="bg-gray-800 p-3 rounded">
      <h4 class="font-bold text-yellow-400 mb-2">Test Results</h4>
      <div class="max-h-32 overflow-y-auto">
        {#each testResults.slice(-5) as result}
          <div class="text-xs">
            [{result.timestamp.slice(11, 19)}] {result.type}: 
            {result.value?.length || 'null'}
          </div>
        {/each}
      </div>
    </div>
  </div>
  
  <!-- Actions -->
  <div class="mt-4 space-x-2">
    <button 
      on:click={checkStoreValue}
      class="bg-blue-600 px-3 py-1 rounded text-white"
    >
      Check Store
    </button>
    <button 
      on:click={testSubscription}
      class="bg-green-600 px-3 py-1 rounded text-white"
    >
      Test Subscription
    </button>
    <button 
      on:click={() => loadDemoData()}
      class="bg-purple-600 px-3 py-1 rounded text-white"
    >
      Load Demo Data
    </button>
  </div>
  
  <!-- Current Applications -->
  <div class="mt-4 bg-gray-800 p-3 rounded">
    <h4 class="font-bold text-yellow-400 mb-2">Current Applications ($applications)</h4>
    <pre class="text-xs overflow-auto">{JSON.stringify($applications, null, 2)}</pre>
  </div>
</div>