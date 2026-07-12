<script lang="ts">
import { ArrowDownRight, ArrowUpRight } from 'lucide-svelte';
import { tfcStore } from '$lib/stores/domains/tfc/tfc.store';

export let clientId: string;

// Extract reactive stores
const {
  balance,
  transactions,
  usageAnalytics,
  loading,
  error,
  timeSavings,
  formattedTimeSaved,
  utilizationPercentage,
  isLowBalance,
  isCriticalBalance,
} = tfcStore;

// Load data when client changes
$: if (clientId) {
  tfcStore.actions.loadTFCData(clientId);
}

// Helper functions (pure, no side effects)
function _formatCurrency(amount: number, currency = 'EUR'): string {
  return `${currency} ${Number.parseFloat(amount.toString()).toLocaleString()}`;
}

function _getTransactionIcon(type: string) {
  return type === 'purchase' ? ArrowUpRight : ArrowDownRight;
}

function _getTransactionColor(type: string): string {
  return type === 'purchase' ? 'text-green-600' : 'text-blue-600';
}

function _formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

// Event handlers
async function _handleRefresh() {
  if (clientId) {
    await tfcStore.actions.loadTFCData(clientId);
  }
}

function _handlePurchaseTFC() {
  // Emit event for parent to handle
  dispatchEvent(new CustomEvent('purchase-tfc'));
}

function _handleViewReport() {
  // Emit event for parent to handle
  dispatchEvent(new CustomEvent('view-report'));
}

// Dispatch events for parent component
import { createEventDispatcher } from 'svelte';

const dispatch = createEventDispatcher<{
  'purchase-tfc': undefined;
  'view-report': undefined;
}>();

function dispatchEvent(event: CustomEvent) {
  dispatch(event.type as keyof typeof dispatch, event.detail);
}
</script>

<div class="space-y-6">
  {#if $loading}
    <div class="flex justify-center py-12">
      <LoadingAnimation message="Loading TFC data..." size="lg" />
    </div>
  {:else if $error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <div class="text-red-800 text-sm">
        Error loading TFC data: {$error}
      </div>
      <button 
        on:click={handleRefresh}
        class="mt-2 text-red-600 hover:text-red-700 text-sm font-medium"
      >
        Try Again
      </button>
    </div>
  {:else if $balance}
    <!-- TFC Overview Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <!-- Current Balance -->
      <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-blue-800">Available Credits</h3>
          <CreditCard class="w-5 h-5 text-blue-600" />
        </div>
        <div class="text-3xl font-bold text-blue-900">
          {$balance.current_balance?.toLocaleString()}
        </div>
        <div class="text-sm text-blue-700 mt-1">TFC Ready to Use</div>
        {#if $isLowBalance}
          <div class="text-xs text-orange-600 mt-1 font-medium">
            {$isCriticalBalance ? '⚠️ Critical' : '⚠️ Low'} Balance
          </div>
        {/if}
      </div>

      <!-- Total Usage -->
      <div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-green-800">Total Used</h3>
          <Activity class="w-5 h-5 text-green-600" />
        </div>
        <div class="text-3xl font-bold text-green-900">
          {$balance.total_used?.toLocaleString()}
        </div>
        <div class="text-sm text-green-700 mt-1">For Past Processes</div>
      </div>

      <!-- Time Saved -->
      <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-medium text-purple-800">Time Saved</h3>
          <TrendingUp class="w-5 h-5 text-purple-600" />
        </div>
        <div class="text-3xl font-bold text-purple-900">{$formattedTimeSaved}</div>
        <div class="text-sm text-purple-700 mt-1">Estimated HR/IT hours recovered</div>
      </div>
    </div>

    <!-- Utilization Chart -->
    <div class="bg-white rounded-lg shadow-sm border">
      <div class="px-6 py-4 border-b">
        <div class="flex justify-between items-center">
          <h3 class="text-lg font-medium text-gray-900">Credit Utilization</h3>
          <button 
            on:click={handleRefresh}
            class="text-gray-400 hover:text-gray-600"
            title="Refresh data"
          >
            <RefreshCw class="w-4 h-4" />
          </button>
        </div>
      </div>
      <div class="p-6">
        <div class="flex justify-between text-sm text-gray-600 mb-2">
          <span>Usage Progress</span>
          <span>{$balance.total_used?.toLocaleString()} / {$balance.total_purchased?.toLocaleString()} purchased</span>
        </div>
        <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            class="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" 
            style="width: {$utilizationPercentage}%"
          ></div>
        </div>
        
        <!-- Auto-replenish Status -->
        {#if $balance.auto_replenish_enabled}
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Auto-replenish active</span>
            <span class="text-green-600 font-medium">
              {$balance.auto_replenish_amount} TFC when below {$balance.auto_replenish_threshold}
            </span>
          </div>
        {:else}
          <div class="flex items-center justify-between text-sm">
            <span class="text-gray-600">Manual replenishment</span>
            <span class="text-orange-600 font-medium">
              Low: {$balance.low_balance_threshold} • Critical: {$balance.critical_balance_threshold}
            </span>
          </div>
        {/if}
      </div>
    </div>

    <!-- Recent Activity & Usage Analytics -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Recent Transactions -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b">
          <div class="flex justify-between items-center">
            <h3 class="text-lg font-medium text-gray-900">Recent Activity</h3>
            <button class="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
          </div>
        </div>
        <div class="divide-y">
          {#each $transactions.slice(0, 5) as transaction (transaction.transaction_id)}
            <div class="px-6 py-4">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full flex items-center justify-center {
                    transaction.transaction_type === 'purchase' ? 'bg-green-100' : 'bg-blue-100'
                  }">
                    <svelte:component 
                      this={getTransactionIcon(transaction.transaction_type)} 
                      class="w-4 h-4 {getTransactionColor(transaction.transaction_type)}" 
                    />
                  </div>
                  <div>
                    <div class="font-medium text-gray-900 text-sm">
                      {transaction.transaction_type === 'purchase' ? 'Credit Purchase' : 'Workflow Usage'}
                    </div>
                    <div class="text-xs text-gray-500">
                      {formatDate(transaction.created_at)}
                      {#if transaction.bulk_discount_tier && transaction.bulk_discount_tier !== 'individual'}
                        • {transaction.discount_percentage}% bulk discount
                      {/if}
                    </div>
                  </div>
                </div>
                <div class="text-right">
                  <div class="font-medium text-sm {getTransactionColor(transaction.transaction_type)}">
                    {transaction.credit_amount > 0 ? '+' : ''}{transaction.credit_amount} TFC
                  </div>
                  {#if transaction.transaction_type === 'usage'}
                    <div class="text-xs text-purple-600">~9 hours saved</div>
                  {:else}
                    <div class="text-xs text-gray-500">
                      {formatCurrency(Math.abs(transaction.total_amount), transaction.currency)}
                    </div>
                  {/if}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Time Savings Analytics -->
      <div class="bg-white rounded-lg shadow-sm border">
        <div class="px-6 py-4 border-b">
          <h3 class="text-lg font-medium text-gray-900">Time Savings by Department (30 days)</h3>
        </div>
        <div class="p-6">
          {#if $usageAnalytics.length > 0}
            <div class="space-y-4">
              {#each $usageAnalytics as usage (usage.department_category + usage.workflow_type)}
                <div class="flex items-center justify-between">
                  <div>
                    <div class="font-medium text-gray-900 text-sm">
                      {usage.department_category || 'Unknown'}
                    </div>
                    <div class="text-xs text-gray-500 capitalize">
                      {usage.count} {usage.workflow_type} processes
                    </div>
                  </div>
                  <div class="text-right">
                    <div class="font-medium text-sm text-purple-600">{usage.hours_saved} hours saved</div>
                    <div class="text-xs text-gray-500">{usage.credits_consumed} TFC used</div>
                  </div>
                </div>
              {/each}
            </div>
            
            <!-- Total Summary -->
            <div class="mt-6 pt-4 border-t">
              <div class="flex items-center justify-between">
                <div class="text-sm font-medium text-gray-900">Total Time Recovered</div>
                <div class="text-lg font-bold text-purple-600">{$timeSavings.totalHoursSaved} hours</div>
              </div>
              <div class="text-xs text-gray-500 mt-1">
                Equivalent to {$timeSavings.workingDaysSaved} full working days
              </div>
            </div>
          {:else}
            <div class="text-center py-6 text-gray-500">
              <div class="text-sm">No recent usage data</div>
              <div class="text-xs mt-1">Time savings will appear here after processes complete</div>
            </div>
          {/if}
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div class="flex flex-wrap gap-4">
      <button 
        on:click={handlePurchaseTFC}
        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
      >
        <Plus class="w-5 h-5" />
        Purchase TFC
      </button>
      <button 
        on:click={handleViewReport}
        class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
      >
        <TrendingUp class="w-5 h-5" />
        Time Savings Report
      </button>
      <button class="border border-gray-300 hover:border-gray-400 text-gray-700 px-6 py-3 rounded-lg font-medium transition-colors">
        View Detailed Analytics
      </button>
    </div>
    
    <!-- Time Savings Methodology -->
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <h4 class="text-sm font-medium text-blue-900 mb-2">Time Savings Calculation</h4>
      <div class="text-sm text-blue-800 space-y-1">
        <div>• <strong>Onboarding:</strong> 10 hours saved per automated process (vs manual)</div>
        <div>• <strong>Offboarding:</strong> 8 hours saved per automated process (vs manual)</div>
        <div>• <strong>Includes:</strong> Document generation, task coordination, compliance tracking, IT provisioning</div>
        <div class="text-xs text-blue-600 mt-2">*Based on industry research and customer feedback from similar-sized organizations</div>
      </div>
    </div>
  {:else}
    <!-- No TFC Data State -->
    <div class="text-center py-12">
      <CreditCard class="w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 class="text-lg font-medium text-gray-900 mb-2">No TFC Data Available</h3>
      <p class="text-gray-600 mb-6">Get started by purchasing your first Thepia Flow Credits</p>
      <button 
        on:click={handlePurchaseTFC}
        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors"
      >
        <Plus class="w-5 h-5" />
        Purchase TFC
      </button>
    </div>
  {/if}
</div>