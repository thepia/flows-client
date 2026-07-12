<script lang="ts">
export let people: any[];
export let loading: boolean = false;
export let hasActiveFilters: boolean = false;
</script>

<!-- People Grid -->
{#if loading}
	<div class="flex justify-center items-center py-12">
		<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
	</div>
{:else if people.length === 0}
	<PeopleEmptyState {hasActiveFilters} />
{:else}
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
		{#each people as person (person.id)}
			<EmployeeCard 
				employee={person} 
				onSelect={() => {
					console.log('Navigating to person:', person.id);
					goto(`/people/${person.id}`);
				}} 
			/>
		{/each}
	</div>
{/if}