<script lang="ts">
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher();

// Props that will be passed from parent
export let allProcesses = [];
export let selectedProcess = null;
export let generateProcessData: () => void;

function _handleProcessSelect(process) {
  selectedProcess = process;
  dispatch('processSelect', { process });
}
</script>

<!-- Processes Tab Content -->
<div class="space-y-8" data-testid="view-processes">
  <!-- Processes Header -->
  <div class="flex justify-between items-center">
    <div>
      <h2 class="text-2xl font-bold text-gray-900">Processes</h2>
      <p class="text-gray-600">Manage and track all processes across applications</p>
    </div>
    <div class="flex space-x-3">
      <button 
        class="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        on:click={generateProcessData}
      >
        <Plus class="w-4 h-4 mr-2" />
        Generate Demo Data
      </button>
      <Button variant="outline">
        <Plus class="w-4 h-4 mr-2" />
        New Process
      </Button>
    </div>
  </div>

  <!-- Processes Table/List -->
  <ProcessList 
    processes={allProcesses}
    onProcessSelect={handleProcessSelect}
  />
  
  {#if allProcesses.length === 0}
    <div class="text-center py-12">
      <div class="text-gray-500">
        <p class="text-lg font-medium">No processes found</p>
        <p class="text-sm mt-2">Processes will appear here as people are enrolled in onboarding/offboarding workflows</p>
      </div>
    </div>
  {/if}
</div>