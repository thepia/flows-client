<script lang="ts">
export let searchTerm: string;
export let selectedStatus: string;
export let selectedType: string;
export let filteredCount: number;
export let totalCount: number;

const _statusOptions = [
  { value: 'all', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'former', label: 'Former' },
  { value: 'future', label: 'Future' },
];

const _typeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'employee', label: 'Employees' },
  { value: 'associate', label: 'Associates' },
];

function _clearAllFilters() {
  searchTerm = '';
  selectedStatus = 'all';
  selectedType = 'all';
}

$: hasActiveFilters = searchTerm || selectedStatus !== 'all' || selectedType !== 'all';
</script>

{#if hasActiveFilters}
	<!-- Active Filters Display -->
	<div class="mb-4 flex items-center space-x-2">
		<span class="text-sm text-gray-500">Active filters:</span>
		{#if searchTerm}
			<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
				Search: {searchTerm}
			</span>
		{/if}
		{#if selectedStatus !== 'all'}
			<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
				Status: {statusOptions.find(o => o.value === selectedStatus)?.label}
			</span>
		{/if}
		{#if selectedType !== 'all'}
			<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
				Type: {typeOptions.find(o => o.value === selectedType)?.label}
			</span>
		{/if}
		<Button
			variant="ghost"
			size="sm"
			on:click={clearAllFilters}
			class="text-xs"
		>
			Clear all
		</Button>
	</div>
{/if}

<!-- Results Count -->
<div class="mb-4 text-sm text-gray-600">
	Showing {filteredCount} of {totalCount} people
</div>