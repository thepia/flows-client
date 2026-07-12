<script lang="ts">
import { onMount } from 'svelte';
import { loadDemoData, people, totalPeopleCount } from '$lib/stores/data';

// Search and filter state
let searchTerm = '';
let selectedStatus = 'all';
let selectedType = 'all';

// Load data on mount
onMount(() => {
  loadDemoData();
});

// Filtered people based on search and filters
$: filteredPeople = $people.filter((person) => {
  // Search filter
  const matchesSearch =
    searchTerm === '' ||
    person.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.position.toLowerCase().includes(searchTerm.toLowerCase());

  // Status filter
  const matchesStatus =
    selectedStatus === 'all' ||
    (selectedStatus === 'active' && person.employmentStatus === 'active') ||
    (selectedStatus === 'former' && person.employmentStatus === 'former') ||
    (selectedStatus === 'future' && person.employmentStatus === 'future');

  // Type filter
  const matchesType =
    selectedType === 'all' ||
    (selectedType === 'employee' && person.employmentStatus) ||
    (selectedType === 'associate' && person.associateStatus);

  return matchesSearch && matchesStatus && matchesType;
});

// Statistics
$: totalPeople = $totalPeopleCount || $people.length;
$: activeEmployees = $people.filter((p) => p.employmentStatus === 'active').length;
$: associates = $people.filter((p) => p.associateStatus).length;
$: futureEmployees = $people.filter((p) => p.employmentStatus === 'future').length;
</script>

<svelte:head>
	<title>People - Flows Admin</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8" data-testid="view-people">
	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
		<PeopleHeader />
		
		<PeopleStatsCards 
			{totalPeople}
			{activeEmployees}
			{associates}
			{futureEmployees}
		/>
		
		<PeopleFilters 
			bind:searchTerm
			bind:selectedStatus
			bind:selectedType
		/>
		
		<PeopleActiveFilters 
			bind:searchTerm
			bind:selectedStatus
			bind:selectedType
			filteredCount={filteredPeople.length}
			totalCount={totalPeople}
		/>
		
		<PeopleGrid 
			people={filteredPeople}
			loading={$loading}
			hasActiveFilters={searchTerm || selectedStatus !== 'all' || selectedType !== 'all'}
		/>
		
		<PeopleLoadMore 
			currentCount={$people.length}
			totalCount={$totalPeopleCount || 0}
			hasActiveFilters={searchTerm || selectedStatus !== 'all' || selectedType !== 'all'}
		/>
	</div>
</div>