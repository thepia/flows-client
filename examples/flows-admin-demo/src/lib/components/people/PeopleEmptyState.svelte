<script lang="ts">
export let hasActiveFilters: boolean;
</script>

<Card>
	<CardContent class="py-12">
		<div class="text-center">
			<Users class="mx-auto h-12 w-12 text-gray-400" />
			<h3 class="mt-2 text-sm font-medium text-gray-900">No people found</h3>
			<p class="mt-1 text-sm text-gray-500">
				{#if hasActiveFilters}
					Try adjusting your search or filter criteria.
				{:else}
					Get started by adding your first person.
				{/if}
			</p>
			{#if !hasActiveFilters}
				<div class="mt-6">
					<Button href="/people/new">
						<UserPlus class="w-4 h-4 mr-2" />
						Add Person
					</Button>
				</div>
			{/if}
		</div>
	</CardContent>
</Card>