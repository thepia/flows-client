<script lang="ts">
import { createEventDispatcher } from 'svelte';

export let currentCount: number;
export let totalCount: number;
export let hasActiveFilters: boolean = false;
export let hasNextPage: boolean = false;
export let loading: boolean = false;

const dispatch = createEventDispatcher<{
  loadMore: undefined;
}>();

$: shouldShowLoadMore = totalCount > currentCount && hasNextPage;

function _handleLoadMore() {
  dispatch('loadMore');
}
</script>

{#if shouldShowLoadMore}
	<!-- Load More Section -->
	<div class="mt-8 text-center">
		<div class="bg-white p-6 rounded-lg border border-gray-200">
			<p class="text-sm text-gray-600 mb-4">
				Showing {currentCount} of {totalCount} people
			</p>
			<Button 
				variant="outline" 
				disabled={loading}
				on:click={handleLoadMore}
			>
				{#if loading}
					<Loader2 class="w-4 h-4 mr-2 animate-spin" />
					Loading More...
				{:else}
					<Users class="w-4 h-4 mr-2" />
					Load More People
				{/if}
			</Button>
			{#if hasActiveFilters}
				<p class="text-xs text-gray-500 mt-2">
					Use pagination controls to navigate through filtered results
				</p>
			{/if}
		</div>
	</div>
{/if}