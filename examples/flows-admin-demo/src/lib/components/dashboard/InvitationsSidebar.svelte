<script lang="ts">
import type { Invitation } from '$lib/types';

// Props
export let invitations: Invitation[];
export const loading: boolean = false;

// Show only recent invitations (last 5)
$: recentInvitations = invitations
  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  .slice(0, 5);
</script>

<Card class="sticky top-16">
	<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
		<CardTitle class="text-base font-medium">Recent Invitations</CardTitle>
		<Button variant="ghost" size="sm" href="/invitations" class="text-xs">
			View All
		</Button>
	</CardHeader>
	<CardContent>
		{#if loading}
			<!-- Loading skeleton -->
			<div class="space-y-3">
				{#each Array(3) as _}
					<div class="flex items-center space-x-3 animate-pulse">
						<div class="w-8 h-8 bg-gray-200 rounded-full"></div>
						<div class="flex-1">
							<div class="w-24 h-3 bg-gray-200 rounded mb-1"></div>
							<div class="w-32 h-2 bg-gray-200 rounded"></div>
						</div>
						<div class="w-12 h-4 bg-gray-200 rounded"></div>
					</div>
				{/each}
			</div>
		{:else if recentInvitations.length === 0}
			<!-- Empty state -->
			<div class="text-center py-6">
				<div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
					<span class="text-xl text-gray-400">📧</span>
				</div>
				<p class="text-sm text-gray-500 mb-3">No recent invitations</p>
				<Button variant="outline" size="sm" href="/invitations/new">
					Create Invitation
				</Button>
			</div>
		{:else}
			<!-- Recent invitations list -->
			<div class="space-y-3">
				{#each recentInvitations as invitation}
					<InvitationCard {invitation} compact={true} />
				{/each}
			</div>
			
			{#if invitations.length > 5}
				<div class="mt-4 pt-3 border-t">
					<Button variant="outline" size="sm" href="/invitations" class="w-full">
						View All {invitations.length} Invitations
					</Button>
				</div>
			{/if}
		{/if}
	</CardContent>
</Card>