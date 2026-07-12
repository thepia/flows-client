<script lang="ts">
import { createEventDispatcher, onMount } from 'svelte';
import { client } from '$lib/stores/data';
import {
  currentPeoplePage,
  getPeopleStatistics,
  loadPeoplePage,
  nextPeoplePage,
  peoplePagination,
  resetPeoplePagination,
  searchPeople,
} from '$lib/stores/pagination';

const _dispatch = createEventDispatcher();

// People tab search and filter state
let searchTerm = '';
let selectedStatus = 'all';
let selectedType = 'all';
let _isSearching = false;
let searchTimeout: number;

// Use paginated data instead of the old people store
$: displayedPeople = $currentPeoplePage || [];
$: pagination = $peoplePagination;

// Reactive search - debounce search queries
$: {
  if (searchTerm !== undefined) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch();
    }, 300); // 300ms debounce
  }
}

// Track previous filter values to prevent unnecessary reloads
let previousStatus = selectedStatus;
let previousType = selectedType;

// Reactive filter handling - trigger when filters change
$: {
  if ($client?.id && (selectedStatus !== previousStatus || selectedType !== previousType)) {
    previousStatus = selectedStatus;
    previousType = selectedType;
    handleFilterChange();
  }
}

async function performSearch() {
  if (!$client?.id) return;

  try {
    _isSearching = true;
    const filters = getActiveFilters();

    if (searchTerm.trim()) {
      // Perform database search with filters
      await searchPeople($client.id, searchTerm.trim(), filters);
    } else {
      // Load regular first page when search is cleared
      resetPeoplePagination();
      await loadPeoplePage($client.id, 0, {
        filters,
      });
    }
  } catch (error) {
    console.error('Search error:', error);
  } finally {
    _isSearching = false;
  }
}

// Convert UI filters to database filters
function getActiveFilters() {
  const filters: Record<string, any> = {};

  // Handle status filter first
  if (selectedStatus !== 'all') {
    filters.employment_status = selectedStatus;
  }

  // Handle type filter (this might override status filter)
  if (selectedType === 'employee') {
    // Show people with employment status (not null) - use specific statuses
    if (selectedStatus === 'all') {
      filters.employment_status = ['active', 'former', 'future'];
    }
    // If a specific status is selected, it will already be set above
  } else if (selectedType === 'associate') {
    // Show people with associate status (not null)
    // We need to use a different approach since we want non-null associate_status
    // This requires a more complex query - for now, we'll handle this on client side
    // TODO: Implement proper associate filtering in database
    filters._associate_filter = true; // Custom marker for associate filtering
  }

  return filters;
}

// Handle filter changes by reloading data
async function handleFilterChange() {
  if (!$client?.id) return;

  try {
    const filters = getActiveFilters();

    if (searchTerm.trim()) {
      // Re-run search with new filters
      await searchPeople($client.id, searchTerm.trim(), filters);
    } else {
      // Reload first page with new filters
      resetPeoplePagination();
      await loadPeoplePage($client.id, 0, {
        filters,
      });
    }
  } catch (error) {
    console.error('Filter error:', error);
  }
}

// Statistics state - these should show UNFILTERED totals (summary cards)
let unfilteredStatistics = {
  totalPeople: 0,
  activeEmployees: 0,
  associates: 0,
  futureEmployees: 0,
};

// Load unfiltered statistics (summary cards at top)
async function loadUnfilteredStatistics() {
  if (!$client?.id) return;

  try {
    // Get statistics without any filters - these are summary cards
    const stats = await getPeopleStatistics($client.id, {});
    unfilteredStatistics = stats;
  } catch (error) {
    console.error('Error loading unfiltered statistics:', error);
  }
}

// Reactive statistics - these should NOT change when filters are applied
$: totalPeople = unfilteredStatistics.totalPeople;
$: activeEmployees = unfilteredStatistics.activeEmployees;
$: associates = unfilteredStatistics.associates;
$: futureEmployees = unfilteredStatistics.futureEmployees;

// Helper for active filters check
$: hasActiveFilters = searchTerm || selectedStatus !== 'all' || selectedType !== 'all';

// Load initial data
onMount(async () => {
  if ($client?.id && !pagination.totalCount) {
    await loadPeoplePage($client.id, 0);
    await loadUnfilteredStatistics(); // Load unfiltered statistics once
  }
});

// Handle load more
async function _handleLoadMore() {
  if ($client?.id && pagination.hasNextPage) {
    await nextPeoplePage($client.id);
  }
}
</script>

<!-- People Tab Content -->
<div class="space-y-6" data-testid="view-people">
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
    on:change={handleFilterChange}
  />

  <PeopleActiveFilters 
    bind:searchTerm
    bind:selectedStatus
    bind:selectedType
    filteredCount={displayedPeople.length}
    totalCount={pagination.totalCount}
    on:change={handleFilterChange}
  />

  <PeopleGrid 
    people={displayedPeople}
    loading={pagination.isLoading || isSearching}
    {hasActiveFilters}
  />

  <PeopleLoadMore 
    currentCount={displayedPeople.length}
    totalCount={pagination.totalCount}
    hasNextPage={pagination.hasNextPage}
    loading={pagination.isLoading}
    {hasActiveFilters}
    on:loadMore={handleLoadMore}
  />
</div>