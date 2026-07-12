<script lang="ts">
import type { DemoMetrics } from '$lib/types';

// Props
export let metrics: DemoMetrics | null;
export const loading: boolean = false;

// Format numbers with commas
function _formatNumber(num: number): string {
  return num.toLocaleString();
}

// Calculate derived metrics
$: completionRate = metrics
  ? Math.round(
      (metrics.completedProcesses / (metrics.activeProcesses + metrics.completedProcesses)) * 100
    )
  : 0;

$: averageTasksPerProcess =
  metrics && metrics.activeProcesses > 0
    ? Math.round(metrics.totalTasks / metrics.activeProcesses)
    : 0;

$: averageDocsPerProcess =
  metrics && metrics.activeProcesses > 0
    ? Math.round(metrics.totalDocuments / metrics.activeProcesses)
    : 0;
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
	<!-- Total Companies -->
	<Card>
		<CardContent class="p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Demo Companies</p>
					<p class="text-2xl font-bold text-gray-900">
						{loading ? '...' : metrics ? formatNumber(metrics.totalCompanies) : '0'}
					</p>
				</div>
				<div class="p-2 bg-blue-100 rounded-lg">
					<Building2 class="w-6 h-6 text-blue-600" />
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Total Employees -->
	<Card>
		<CardContent class="p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Total Employees</p>
					<p class="text-2xl font-bold text-gray-900">
						{loading ? '...' : metrics ? formatNumber(metrics.totalEmployees) : '0'}
					</p>
				</div>
				<div class="p-2 bg-green-100 rounded-lg">
					<Users class="w-6 h-6 text-green-600" />
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Active Processes -->
	<Card>
		<CardContent class="p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Active Processes</p>
					<p class="text-2xl font-bold text-gray-900">
						{loading ? '...' : metrics ? formatNumber(metrics.activeProcesses) : '0'}
					</p>
				</div>
				<div class="p-2 bg-orange-100 rounded-lg">
					<Activity class="w-6 h-6 text-orange-600" />
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Completion Rate -->
	<Card>
		<CardContent class="p-4">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm font-medium text-gray-600">Completion Rate</p>
					<p class="text-2xl font-bold text-gray-900">
						{loading ? '...' : `${completionRate}%`}
					</p>
				</div>
				<div class="p-2 bg-purple-100 rounded-lg">
					<TrendingUp class="w-6 h-6 text-purple-600" />
				</div>
			</div>
		</CardContent>
	</Card>
</div>

<!-- Detailed metrics -->
<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
	<!-- Process Details -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center text-base">
				<CheckCircle class="w-5 h-5 mr-2" />
				Process Overview
			</CardTitle>
			<CardDescription>
				Summary of all demo processes across companies
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if loading}
				<div class="space-y-3">
					{#each Array(3) as _}
						<div class="flex justify-between items-center">
							<div class="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
							<div class="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
						</div>
					{/each}
				</div>
			{:else if metrics}
				<div class="space-y-3">
					<div class="flex justify-between items-center">
						<span class="text-sm text-gray-600">Active Processes</span>
						<span class="font-semibold">{formatNumber(metrics.activeProcesses)}</span>
					</div>
					<div class="flex justify-between items-center">
						<span class="text-sm text-gray-600">Completed Processes</span>
						<span class="font-semibold">{formatNumber(metrics.completedProcesses)}</span>
					</div>
					<div class="flex justify-between items-center">
						<span class="text-sm text-gray-600">Completion Rate</span>
						<span class="font-semibold">{completionRate}%</span>
					</div>
					<div class="pt-2 border-t">
						<div class="flex justify-between items-center">
							<span class="text-sm text-gray-600">Total Processes</span>
							<span class="font-semibold">{formatNumber(metrics.activeProcesses + metrics.completedProcesses)}</span>
						</div>
					</div>
				</div>
			{:else}
				<p class="text-sm text-gray-500">No metrics available</p>
			{/if}
		</CardContent>
	</Card>

	<!-- Content Overview -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center text-base">
				<FileText class="w-5 h-5 mr-2" />
				Content Overview
			</CardTitle>
			<CardDescription>
				Documents and tasks generated across all demos
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if loading}
				<div class="space-y-3">
					{#each Array(4) as _}
						<div class="flex justify-between items-center">
							<div class="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
							<div class="w-16 h-4 bg-gray-200 rounded animate-pulse"></div>
						</div>
					{/each}
				</div>
			{:else if metrics}
				<div class="space-y-3">
					<div class="flex justify-between items-center">
						<span class="text-sm text-gray-600">Total Documents</span>
						<span class="font-semibold">{formatNumber(metrics.totalDocuments)}</span>
					</div>
					<div class="flex justify-between items-center">
						<span class="text-sm text-gray-600">Total Tasks</span>
						<span class="font-semibold">{formatNumber(metrics.totalTasks)}</span>
					</div>
					<div class="pt-2 border-t">
						<div class="flex justify-between items-center">
							<span class="text-sm text-gray-600">Docs per Process</span>
							<span class="font-semibold">~{averageDocsPerProcess}</span>
						</div>
						<div class="flex justify-between items-center">
							<span class="text-sm text-gray-600">Tasks per Process</span>
							<span class="font-semibold">~{averageTasksPerProcess}</span>
						</div>
					</div>
				</div>
			{:else}
				<p class="text-sm text-gray-500">No metrics available</p>
			{/if}
		</CardContent>
	</Card>
</div>

{#if metrics?.lastUpdated}
	<div class="text-center text-xs text-gray-500 mt-4">
		Last updated: {new Date(metrics.lastUpdated).toLocaleString()}
	</div>
{/if}