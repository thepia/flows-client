<script lang="ts">
import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-svelte';
import type { DemoCompany } from '$lib/types';

// Props
export let company: DemoCompany;
export const onGenerate: (companyId: string) => void = () => {};
export const onReset: (companyId: string) => void = () => {};
export const onEdit: (companyId: string) => void = () => {};
export const onDelete: (companyId: string) => void = () => {};

// Get status icon and color
function getStatusDisplay(status: DemoCompany['generationStatus']) {
  switch (status) {
    case 'completed':
      return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' };
    case 'generating':
      return { icon: Loader2, color: 'text-blue-600', bgColor: 'bg-blue-50' };
    case 'error':
      return { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50' };
    default:
      return { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
}

function _getComplexityColor(complexity: string) {
  switch (complexity) {
    case 'simple':
      return 'bg-green-100 text-green-800';
    case 'complex':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

function _getDemoTypeColor(type: string) {
  switch (type) {
    case 'prospect':
      return 'bg-purple-100 text-purple-800';
    case 'training':
      return 'bg-orange-100 text-orange-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

$: statusDisplay = getStatusDisplay(company.generationStatus);
$: lastGenerated = company.lastGenerated
  ? new Date(company.lastGenerated).toLocaleDateString()
  : 'Never';
</script>

<Card class="hover:shadow-md transition-shadow">
	<CardHeader class="pb-3">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<CardTitle class="text-lg">{company.displayName}</CardTitle>
				<CardDescription class="mt-1">{company.description}</CardDescription>
				
				<!-- Tags -->
				<div class="flex items-center space-x-2 mt-3">
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getDemoTypeColor(company.demoType)}">
						{company.demoType}
					</span>
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getComplexityColor(company.complexity)}">
						{company.complexity}
					</span>
					<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
						{company.industry}
					</span>
				</div>
			</div>
			
			<!-- Status indicator -->
			<div class="flex items-center space-x-2 {statusDisplay.bgColor} px-3 py-1 rounded-full">
				<svelte:component 
					this={statusDisplay.icon} 
					class="w-4 h-4 {statusDisplay.color} {company.generationStatus === 'generating' ? 'animate-spin' : ''}" 
				/>
				<span class="text-sm font-medium {statusDisplay.color} capitalize">
					{company.generationStatus.replace('_', ' ')}
				</span>
			</div>
		</div>
	</CardHeader>
	
	<CardContent class="space-y-4">
		<!-- Metrics -->
		<div class="grid grid-cols-3 gap-4">
			<div class="text-center">
				<div class="flex items-center justify-center text-blue-600 mb-1">
					<Users class="w-4 h-4 mr-1" />
					<span class="text-lg font-semibold">{company.employeeCount.toLocaleString()}</span>
				</div>
				<p class="text-xs text-gray-500">Employees</p>
			</div>
			
			<div class="text-center">
				<div class="flex items-center justify-center text-green-600 mb-1">
					<TrendingUp class="w-4 h-4 mr-1" />
					<span class="text-lg font-semibold">{company.onboardingCount}</span>
				</div>
				<p class="text-xs text-gray-500">Onboarding</p>
			</div>
			
			<div class="text-center">
				<div class="flex items-center justify-center text-orange-600 mb-1">
					<TrendingDown class="w-4 h-4 mr-1" />
					<span class="text-lg font-semibold">{company.offboardingCount}</span>
				</div>
				<p class="text-xs text-gray-500">Offboarding</p>
			</div>
		</div>

		<!-- Last generated info -->
		<div class="text-center py-2 border-t">
			<p class="text-xs text-gray-500">
				Last Generated: <span class="font-medium">{lastGenerated}</span>
			</p>
		</div>

		<!-- Actions -->
		<div class="flex items-center justify-between pt-2 border-t">
			<div class="flex space-x-2">
				<Button 
					variant="outline" 
					size="sm" 
					on:click={() => onEdit(company.id)}
					class="text-xs"
				>
					<Edit class="w-3 h-3 mr-1" />
					Edit
				</Button>
				
				<Button 
					variant="outline" 
					size="sm" 
					on:click={() => onReset(company.id)}
					disabled={company.generationStatus === 'generating' || company.generationStatus === 'not_generated'}
					class="text-xs"
				>
					<RotateCcw class="w-3 h-3 mr-1" />
					Reset
				</Button>
			</div>
			
			<div class="flex space-x-2">
				<Button 
					size="sm" 
					on:click={() => onGenerate(company.id)}
					disabled={company.generationStatus === 'generating'}
					class="text-xs"
				>
					{#if company.generationStatus === 'generating'}
						<Loader2 class="w-3 h-3 mr-1 animate-spin" />
						Generating...
					{:else}
						<Play class="w-3 h-3 mr-1" />
						{company.generationStatus === 'not_generated' ? 'Generate' : 'Regenerate'}
					{/if}
				</Button>
				
				<Button 
					variant="ghost" 
					size="sm" 
					on:click={() => onDelete(company.id)}
					disabled={company.generationStatus === 'generating'}
					class="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
				>
					<Trash2 class="w-3 h-3" />
				</Button>
			</div>
		</div>
	</CardContent>
</Card>