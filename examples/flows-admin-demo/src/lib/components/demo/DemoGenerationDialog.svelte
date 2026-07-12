<script lang="ts">
import type { DemoCompany, DemoGenerationConfig } from '$lib/types';

// Props
export const company: DemoCompany | null = null;
export const isOpen: boolean = false;
export const onClose: () => void = () => {};
export const onGenerate: (config: DemoGenerationConfig) => Promise<void> = async () => {};

// Generation configuration
let config: DemoGenerationConfig = {
  companyId: '',
  employeeCount: 1000,
  onboardingCount: 25,
  offboardingCount: 15,
  includeHistoricalData: true,
  generateDocuments: true,
  generateTasks: true,
  complexity: 'standard',
};

let isGenerating = false;

// Update config when company changes
$: if (company) {
  config = {
    companyId: company.id,
    employeeCount: company.employeeCount || 1000,
    onboardingCount: company.onboardingCount || 25,
    offboardingCount: company.offboardingCount || 15,
    includeHistoricalData: true,
    generateDocuments: true,
    generateTasks: true,
    complexity: company.complexity,
  };
}

// Handle generation
async function _handleGenerate() {
  if (!company || isGenerating) return;

  isGenerating = true;
  try {
    await onGenerate(config);
    onClose();
  } catch (error) {
    console.error('Generation failed:', error);
  } finally {
    isGenerating = false;
  }
}

// Calculate estimated time
$: estimatedMinutes = Math.round(
  config.employeeCount / 100 +
    config.onboardingCount * 2 +
    config.offboardingCount * 2 +
    (config.includeHistoricalData ? 5 : 0) +
    (config.generateDocuments ? 3 : 0) +
    (config.generateTasks ? 2 : 0)
);

// Get complexity description
function _getComplexityDescription(complexity: string) {
  switch (complexity) {
    case 'simple':
      return 'Basic employee profiles with standard processes';
    case 'complex':
      return 'Rich demographics, complex workflows, and extensive relationships';
    default:
      return 'Balanced profiles with realistic complexity';
  }
}
</script>

{#if isOpen && company}
	<!-- Backdrop -->
	<div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
		<!-- Dialog -->
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<!-- Header -->
			<div class="flex items-center justify-between p-6 border-b">
				<div>
					<h2 class="text-xl font-semibold text-gray-900">Generate Demo Data</h2>
					<p class="text-sm text-gray-500 mt-1">{company.displayName}</p>
				</div>
				<Button variant="ghost" size="sm" on:click={onClose}>
					<X class="w-4 h-4" />
				</Button>
			</div>

			<!-- Content -->
			<div class="p-6 space-y-6">
				<!-- Employee Configuration -->
				<Card>
					<CardHeader class="pb-3">
						<CardTitle class="text-base flex items-center">
							<Users class="w-4 h-4 mr-2" />
							Employee Configuration
						</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="grid grid-cols-3 gap-4">
							<div>
								<label for="employee-count" class="block text-sm font-medium text-gray-700 mb-1">
									Total Employees
								</label>
								<input
									id="employee-count"
									type="number"
									bind:value={config.employeeCount}
									min="10"
									max="5000"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
							<div>
								<label for="onboarding-count" class="block text-sm font-medium text-gray-700 mb-1">
									Onboarding
								</label>
								<input
									id="onboarding-count"
									type="number"
									bind:value={config.onboardingCount}
									min="0"
									max="100"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
							<div>
								<label for="offboarding-count" class="block text-sm font-medium text-gray-700 mb-1">
									Offboarding
								</label>
								<input
									id="offboarding-count"
									type="number"
									bind:value={config.offboardingCount}
									min="0"
									max="100"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Complexity Configuration -->
				<Card>
					<CardHeader class="pb-3">
						<CardTitle class="text-base flex items-center">
							<Settings class="w-4 h-4 mr-2" />
							Data Complexity
						</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div>
							<label for="complexity" class="block text-sm font-medium text-gray-700 mb-1">
								Complexity Level
							</label>
							<select
								id="complexity"
								bind:value={config.complexity}
								class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="simple">Simple</option>
								<option value="standard">Standard</option>
								<option value="complex">Complex</option>
							</select>
							<p class="text-xs text-gray-500 mt-1">
								{getComplexityDescription(config.complexity)}
							</p>
						</div>
					</CardContent>
				</Card>

				<!-- Content Options -->
				<Card>
					<CardHeader class="pb-3">
						<CardTitle class="text-base flex items-center">
							<FileText class="w-4 h-4 mr-2" />
							Content Generation
						</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="space-y-3">
							<div class="flex items-center space-x-3">
								<input
									id="include-historical"
									type="checkbox"
									bind:checked={config.includeHistoricalData}
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<div>
									<label for="include-historical" class="text-sm font-medium text-gray-700">
										Include Historical Data
									</label>
									<p class="text-xs text-gray-500">
										Generate past processes and completed workflows
									</p>
								</div>
							</div>

							<div class="flex items-center space-x-3">
								<input
									id="generate-documents"
									type="checkbox"
									bind:checked={config.generateDocuments}
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<div>
									<label for="generate-documents" class="text-sm font-medium text-gray-700">
										Generate Documents
									</label>
									<p class="text-xs text-gray-500">
										Create realistic document instances and templates
									</p>
								</div>
							</div>

							<div class="flex items-center space-x-3">
								<input
									id="generate-tasks"
									type="checkbox"
									bind:checked={config.generateTasks}
									class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
								/>
								<div>
									<label for="generate-tasks" class="text-sm font-medium text-gray-700">
										Generate Tasks
									</label>
									<p class="text-xs text-gray-500">
										Create task instances and workflow templates
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<!-- Generation Summary -->
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div class="flex items-start">
						<Zap class="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
						<div>
							<h4 class="text-sm font-medium text-blue-900">Generation Summary</h4>
							<div class="mt-2 text-sm text-blue-800">
								<p>• {config.employeeCount.toLocaleString()} employee profiles</p>
								<p>• {config.onboardingCount + config.offboardingCount} active processes</p>
								{#if config.includeHistoricalData}
									<p>• ~{Math.round(config.employeeCount * 0.3)} historical processes</p>
								{/if}
								{#if config.generateDocuments}
									<p>• ~{Math.round((config.onboardingCount + config.offboardingCount) * 15)} documents</p>
								{/if}
								{#if config.generateTasks}
									<p>• ~{Math.round((config.onboardingCount + config.offboardingCount) * 25)} tasks</p>
								{/if}
							</div>
							<p class="text-xs text-blue-600 mt-2">
								Estimated generation time: ~{estimatedMinutes} minutes
							</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer -->
			<div class="flex items-center justify-end space-x-3 p-6 border-t bg-gray-50">
				<Button variant="outline" on:click={onClose} disabled={isGenerating}>
					Cancel
				</Button>
				<Button on:click={handleGenerate} disabled={isGenerating}>
					{#if isGenerating}
						<Zap class="w-4 h-4 mr-2 animate-pulse" />
						Generating...
					{:else}
						<Zap class="w-4 h-4 mr-2" />
						Start Generation
					{/if}
				</Button>
			</div>
		</div>
	</div>
{/if}