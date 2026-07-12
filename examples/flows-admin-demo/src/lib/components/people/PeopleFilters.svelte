<script lang="ts">
export let searchTerm: string;
export let selectedStatus: string;
export let selectedType: string;

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
</script>

<!-- Search and Filters -->
<Card class="mb-8">
	<CardHeader>
		<CardTitle class="flex items-center">
			<Search class="w-5 h-5 mr-2" />
			Search & Filter
		</CardTitle>
	</CardHeader>
	<CardContent>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<!-- Search Input -->
			<div>
				<label for="search" class="block text-sm font-medium text-gray-700 mb-2">
					Search People
				</label>
				<div class="relative">
					<Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
					<Input
						id="search"
						type="text"
						placeholder="Search by name, email, department..."
						bind:value={searchTerm}
						class="pl-10"
					/>
				</div>
			</div>

			<!-- Status Filter -->
			<div>
				<label for="status-filter" class="block text-sm font-medium text-gray-700 mb-2">
					Filter by Status
				</label>
				<select
					id="status-filter"
					bind:value={selectedStatus}
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
				>
					{#each statusOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>

			<!-- Type Filter -->
			<div>
				<label for="type-filter" class="block text-sm font-medium text-gray-700 mb-2">
					Filter by Type
				</label>
				<select
					id="type-filter"
					bind:value={selectedType}
					class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
				>
					{#each typeOptions as option}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</CardContent>
</Card>