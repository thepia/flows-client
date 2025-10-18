<script lang="ts">
import LoadingAnimation from '$lib/components/shared/LoadingAnimation.svelte';
import { supabaseClientStore, isSupabaseAuthenticatedStore } from '$lib/contexts/supabase-context';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CreditCard,
  Plus,
  TrendingUp,
} from 'lucide-svelte';
import { onMount } from 'svelte';

export let clientId: string;

// Use global stores directly

// State
let loading = false;
let tfcBalance = null;
let recentTransactions = [];
let usageAnalytics = [];
let monthlyTrend = [];

// Load TFC data
async function loadTFCData() {
  if (!clientId) return;

  if (!$isSupabaseAuthenticatedStore || !$supabaseClientStore) {
    console.warn('TFC data requires authentication');
    return;
  }

  loading = true;
  try {
    // Load TFC balance
    const { data: balanceData } = await $supabaseClientStore
      .from('tfc_client_balances')
      .select('*')
      .eq('client_id', clientId)
      .single();

    tfcBalance = balanceData;

    // Load recent transactions (last 10)
    const { data: transactionsData } = await $supabaseClientStore
      .from('tfc_credit_transactions')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(10);

    recentTransactions = transactionsData || [];

    // Load usage analytics by workflow type
    const { data: usageData } = await $supabaseClientStore
      .from('tfc_workflow_usage')
      .select('workflow_type, department_category, credits_consumed, consumed_at')
      .eq('client_id', clientId)
      .gte('consumed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('consumed_at', { ascending: false });

    // Process usage analytics
    if (usageData) {
      const analytics = {};
      usageData.forEach((usage) => {
        const key = `${usage.workflow_type}-${usage.department_category}`;
        if (!analytics[key]) {
          analytics[key] = {
            workflow_type: usage.workflow_type,
            department: usage.department_category,
            count: 0,
            credits: 0,
          };
        }
        analytics[key].count += 1;
        analytics[key].credits += usage.credits_consumed;
      });
      usageAnalytics = Object.values(analytics).slice(0, 6);
    }

    // Calculate monthly trend (last 6 months)
    const monthlyData = {};
    recentTransactions.forEach((transaction) => {
      const date = new Date(transaction.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthKey, purchases: 0, usage: 0 };
      }

      if (transaction.transaction_type === 'purchase') {
        monthlyData[monthKey].purchases += transaction.credit_amount;
      } else if (transaction.transaction_type === 'usage') {
        monthlyData[monthKey].usage += Math.abs(transaction.credit_amount);
      }
    });

    monthlyTrend = Object.values(monthlyData).slice(0, 6).reverse();
  } catch (error) {
    console.error('Error loading TFC data:', error);
  } finally {
    loading = false;
  }
}

// Helper functions
function formatCurrency(amount, currency = 'EUR') {
  return `${currency} ${Number.parseFloat(amount).toLocaleString()}`;
}

function getTransactionIcon(type) {
  return type === 'purchase' ? ArrowUpRight : ArrowDownRight;
}

function getTransactionColor(type) {
  return type === 'purchase' ? 'text-green-600' : 'text-blue-600';
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString();
}

// Calculate time saved based on completed processes
function calculateTimeSaved(totalUsed) {
  if (!totalUsed) return '0 hours';

  // Time savings per process type (based on industry research):
  // - Manual onboarding: 8-12 hours of HR/IT time per person
  // - Manual offboarding: 6-10 hours of HR/IT time per person
  // - Average: 9 hours saved per automated process

  const averageHoursSavedPerProcess = 9;
  const totalHoursSaved = totalUsed * averageHoursSavedPerProcess;

  // Format based on scale
  if (totalHoursSaved >= 1000) {
    return `${Math.round(totalHoursSaved / 100) / 10}k hours`;
  } else {
    return `${totalHoursSaved.toLocaleString()} hours`;
  }
}

// Calculate detailed time savings with workflow breakdown
function calculateDetailedTimeSavings(usageData) {
  if (!usageData || usageData.length === 0) return null;

  const timeSavings = {
    onboarding: { hours: 10, processes: 0 }, // 10 hours saved per onboarding
    offboarding: { hours: 8, processes: 0 }, // 8 hours saved per offboarding
  };

  usageData.forEach((usage) => {
    if (timeSavings[usage.workflow_type]) {
      timeSavings[usage.workflow_type].processes += usage.count;
    }
  });

  const totalSaved =
    timeSavings.onboarding.processes * timeSavings.onboarding.hours +
    timeSavings.offboarding.processes * timeSavings.offboarding.hours;

  return {
    total: totalSaved,
    breakdown: timeSavings,
  };
}

onMount(() => {
  loadTFCData();
});

// Reactive updates when clientId changes
$: if (clientId) {
  loadTFCData();
}
</script>

<div class="space-y-6">
	{#if loading}
		<div class="flex justify-center py-12">
			<LoadingAnimation message="Loading TFC data..." size="lg" />
		</div>
	{:else if tfcBalance}
		<!-- TFC Overview Cards -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
			<!-- Current Balance -->
			<div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-sm font-medium text-blue-800">Available Credits</h3>
					<CreditCard class="w-5 h-5 text-blue-600" />
				</div>
				<div class="text-3xl font-bold text-blue-900">{tfcBalance.current_balance?.toLocaleString()}</div>
				<div class="text-sm text-blue-700 mt-1">TFC Ready to Use</div>
			</div>

			<!-- Total Usage -->
			<div class="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-6">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-sm font-medium text-green-800">Total Used</h3>
					<Activity class="w-5 h-5 text-green-600" />
				</div>
				<div class="text-3xl font-bold text-green-900">{tfcBalance.total_used?.toLocaleString()}</div>
				<div class="text-sm text-green-700 mt-1">For Past Processes</div>
			</div>

			<!-- Time Saved -->
			<div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6">
				<div class="flex items-center justify-between mb-2">
					<h3 class="text-sm font-medium text-purple-800">Time Saved</h3>
					<TrendingUp class="w-5 h-5 text-purple-600" />
				</div>
				<div class="text-3xl font-bold text-purple-900">{calculateTimeSaved(tfcBalance.total_used)}</div>
				<div class="text-sm text-purple-700 mt-1">Estimated HR/IT hours recovered</div>
			</div>
		</div>

		<!-- Utilization Chart -->
		<div class="bg-white rounded-lg shadow-sm border">
			<div class="px-6 py-4 border-b">
				<h3 class="text-lg font-medium text-gray-900">Credit Utilization</h3>
			</div>
			<div class="p-6">
				<div class="flex justify-between text-sm text-gray-600 mb-2">
					<span>Usage Progress</span>
					<span>{tfcBalance.total_used?.toLocaleString()} / {tfcBalance.total_purchased?.toLocaleString()} purchased</span>
				</div>
				<div class="w-full bg-gray-200 rounded-full h-3 mb-4">
					<div 
						class="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500" 
						style="width: {Math.min(100, (tfcBalance.total_used / Math.max(1, tfcBalance.total_purchased)) * 100)}%"
					></div>
				</div>
				
				<!-- Auto-replenish Status -->
				{#if tfcBalance.auto_replenish_enabled}
					<div class="flex items-center justify-between text-sm">
						<span class="text-gray-600">Auto-replenish active</span>
						<span class="text-green-600 font-medium">
							{tfcBalance.auto_replenish_amount} TFC when below {tfcBalance.auto_replenish_threshold}
						</span>
					</div>
				{:else}
					<div class="flex items-center justify-between text-sm">
						<span class="text-gray-600">Manual replenishment</span>
						<span class="text-orange-600 font-medium">
							Low: {tfcBalance.low_balance_threshold} • Critical: {tfcBalance.critical_balance_threshold}
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
					{#each recentTransactions.slice(0, 5) as transaction}
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
										<div class="text-xs text-gray-500">{formatCurrency(Math.abs(transaction.total_amount), transaction.currency)}</div>
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
					{#if usageAnalytics.length > 0}
						<div class="space-y-4">
							{#each usageAnalytics as usage}
								{@const hoursSaved = usage.workflow_type === 'onboarding' ? usage.count * 10 : usage.count * 8}
								<div class="flex items-center justify-between">
									<div>
										<div class="font-medium text-gray-900 text-sm">
											{usage.department || 'Unknown'}
										</div>
										<div class="text-xs text-gray-500 capitalize">
											{usage.count} {usage.workflow_type} processes
										</div>
									</div>
									<div class="text-right">
										<div class="font-medium text-sm text-purple-600">{hoursSaved} hours saved</div>
										<div class="text-xs text-gray-500">{usage.credits} TFC used</div>
									</div>
								</div>
							{/each}
						</div>
						
						<!-- Total Summary -->
						{@const totalHoursSaved = usageAnalytics.reduce((sum, usage) => {
							const hours = usage.workflow_type === 'onboarding' ? usage.count * 10 : usage.count * 8;
							return sum + hours;
						}, 0)}
						
						<div class="mt-6 pt-4 border-t">
							<div class="flex items-center justify-between">
								<div class="text-sm font-medium text-gray-900">Total Time Recovered</div>
								<div class="text-lg font-bold text-purple-600">{totalHoursSaved} hours</div>
							</div>
							<div class="text-xs text-gray-500 mt-1">
								Equivalent to {Math.round(totalHoursSaved / 8)} full working days
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
			<button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors">
				<Plus class="w-5 h-5" />
				Purchase TFC
			</button>
			<button class="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors">
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
			<button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 mx-auto transition-colors">
				<Plus class="w-5 h-5" />
				Purchase TFC
			</button>
		</div>
	{/if}
</div>