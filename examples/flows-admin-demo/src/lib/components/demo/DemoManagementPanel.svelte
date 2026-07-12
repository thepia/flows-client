<script lang="ts">
import { onMount } from 'svelte';
import { demoCompanies, demoManagementStore } from '$lib/stores/demoManagement';
import type { DemoCompany } from '$lib/types';

// Dialog state
let _isGenerationDialogOpen = false;
let _selectedCompany: DemoCompany | null = null;

// Initialize demo data on mount
onMount(async () => {
  try {
    await demoManagementStore.init();
  } catch (error) {
    console.error('Failed to initialize demo data:', error);
  }
});

// Handle demo actions
function _handleGenerate(companyId: string) {
  const company = $demoCompanies.find((c) => c.id === companyId);
  if (company) {
    _selectedCompany = company;
    _isGenerationDialogOpen = true;
  }
}

function _handleReset(companyId: string) {
  if (
    confirm(
      'Are you sure you want to reset all demo data for this company? This action cannot be undone.'
    )
  ) {
    demoManagementStore.resetCompany(companyId);
  }
}

function _handleEdit(companyId: string) {
  // TODO: Implement company edit dialog
  console.log('Edit company:', companyId);
}

function _handleDelete(companyId: string) {
  if (confirm('Are you sure you want to delete this demo company? This action cannot be undone.')) {
    demoManagementStore.deleteCompany(companyId);
  }
}

// Handle generation dialog
function _closeGenerationDialog() {
  _isGenerationDialogOpen = false;
  _selectedCompany = null;
}

async function _handleGenerateData(config: any) {
  try {
    await demoManagementStore.generateDemoData(config);
  } catch (error) {
    console.error('Demo generation failed:', error);
  }
}

// Clear error
function _clearError() {
  demoManagementStore.clearError();
}
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h2 class="text-xl font-semibold text-gray-900">Demo Data Management</h2>
			<p class="text-sm text-gray-500 mt-1">
				Manage demo companies, generate data, and monitor system metrics
			</p>
		</div>
		<Button size="sm" class="flex items-center">
			<Plus class="w-4 h-4 mr-2" />
			Add Company
		</Button>
	</div>

	<!-- Database Status Alert -->
	{#if $demoError}
		{#if $demoError.includes('offline') || $demoError.includes('unavailable')}
			<div class="bg-amber-50 border border-amber-200 rounded-lg p-4">
				<div class="flex items-start">
					<WifiOff class="w-5 h-5 text-amber-600 mt-0.5 mr-3" />
					<div class="flex-1">
						<h4 class="text-sm font-medium text-amber-900">Database Offline</h4>
						<p class="text-sm text-amber-800 mt-1">Running in demo simulation mode. Data generation will be simulated without database storage.</p>
					</div>
					<Button variant="ghost" size="sm" on:click={clearError} class="text-amber-600">
						×
					</Button>
				</div>
			</div>
		{:else}
			<div class="bg-red-50 border border-red-200 rounded-lg p-4">
				<div class="flex items-start">
					<AlertTriangle class="w-5 h-5 text-red-600 mt-0.5 mr-3" />
					<div class="flex-1">
						<h4 class="text-sm font-medium text-red-900">Error</h4>
						<p class="text-sm text-red-800 mt-1">{$demoError}</p>
					</div>
					<Button variant="ghost" size="sm" on:click={clearError} class="text-red-600">
						×
					</Button>
				</div>
			</div>
		{/if}
	{/if}

	<!-- Metrics Dashboard -->
	<DemoMetricsDashboard 
		metrics={$demoMetrics} 
		loading={$isDemoLoading} 
	/>

	<!-- Action Progress -->
	<DemoActionProgress />

	<!-- Demo Companies -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center">
				Demo Companies
			</CardTitle>
			<CardDescription>
				Manage and configure demo company data for different use cases
			</CardDescription>
		</CardHeader>
		<CardContent>
			{#if $isDemoLoading}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each Array(2) as _}
						<!-- Loading skeleton -->
						<div class="animate-pulse">
							<div class="bg-gray-200 rounded-lg h-64"></div>
						</div>
					{/each}
				</div>
				<div class="text-center text-gray-500 mt-4">
					Loading demo companies...
				</div>
			{:else if $demoCompanies.length > 0}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					{#each $demoCompanies as company (company.id)}
						<DemoCompanyCard 
							{company}
							onGenerate={handleGenerate}
							onReset={handleReset}
							onEdit={handleEdit}
							onDelete={handleDelete}
						/>
					{/each}
				</div>
			{:else}
				<div class="text-center py-8">
					<Database class="w-12 h-12 text-gray-400 mx-auto mb-4" />
					<h3 class="text-lg font-medium text-gray-900">No demo companies</h3>
					<p class="text-sm text-gray-500 mt-1">
						Get started by creating your first demo company
					</p>
					<Button class="mt-4" size="sm">
						<Plus class="w-4 h-4 mr-2" />
						Create Demo Company
					</Button>
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Quick Actions -->
	<Card>
		<CardHeader>
			<CardTitle>Quick Actions</CardTitle>
			<CardDescription>
				Common demo management tasks and utilities
			</CardDescription>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Button variant="outline" class="justify-start h-auto p-4" disabled>
					<div class="text-left">
						<div class="font-medium">Export All Data</div>
						<div class="text-xs text-gray-500 mt-1">Download demo data as JSON</div>
					</div>
				</Button>
				
				<Button variant="outline" class="justify-start h-auto p-4" disabled>
					<div class="text-left">
						<div class="font-medium">Import Demo Data</div>
						<div class="text-xs text-gray-500 mt-1">Upload data from file</div>
					</div>
				</Button>
				
				<Button variant="outline" class="justify-start h-auto p-4" disabled>
					<div class="text-left">
						<div class="font-medium">Template Library</div>
						<div class="text-xs text-gray-500 mt-1">Manage document templates</div>
					</div>
				</Button>
			</div>
		</CardContent>
	</Card>
</div>

<!-- Generation Dialog -->
<DemoGenerationDialog
	company={selectedCompany}
	isOpen={isGenerationDialogOpen}
	onClose={closeGenerationDialog}
	onGenerate={handleGenerateData}
/>