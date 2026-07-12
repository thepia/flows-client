<script lang="ts">
import type { Invitation } from '$lib/types';

// Props
export let invitation: Invitation;
export const compact: boolean = false;
export const showActions: boolean = true;

// Format date helper
function _formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString();
}
</script>

<div class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors {compact ? 'p-3' : 'p-4'}">
	<div class="flex items-center space-x-4">
		<div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
			<span class="text-sm font-medium text-primary">
				{invitation.firstName ? invitation.firstName[0] : '?'}
			</span>
		</div>
		<div>
			<h3 class="font-medium text-gray-900">
				{invitation.firstName} {invitation.lastName}
			</h3>
			<p class="text-sm text-gray-500">{invitation.companyEmail}</p>
			{#if !compact}
				<p class="text-xs text-gray-400">
					{invitation.department} • {invitation.invitationType} • {formatDate(invitation.createdAt)}
				</p>
			{/if}
		</div>
	</div>
	
	<div class="flex items-center space-x-4">
		{#if !compact}
			<div class="text-right">
				<div class="text-sm text-gray-500">
					Expires: {formatDate(invitation.expiresAt)}
				</div>
				{#if invitation.acceptedAt}
					<div class="text-xs text-gray-400">
						Accepted: {formatDate(invitation.acceptedAt)}
					</div>
				{/if}
			</div>
		{/if}
		
		<InvitationStatusBadge status={invitation.status} size={compact ? 'sm' : 'md'} />
		
		{#if showActions}
			<InvitationActionsDropdown {invitation} />
		{/if}
	</div>
</div>