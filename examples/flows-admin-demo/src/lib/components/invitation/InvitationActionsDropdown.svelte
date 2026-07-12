<script lang="ts">
import { Eye, RefreshCw, Share, XCircle } from 'lucide-svelte';
import { useInvitationActions } from '$lib/composables/useInvitationActions';
import type { Invitation } from '$lib/types';

export let invitation: Invitation;
export let isOpen: boolean;
export let onToggle: () => void;
export const onActionComplete: () => void = () => {};
export const compact: boolean = false;

// Use the invitation actions composable
const { getAvailableActions, executeAction } = useInvitationActions();

// Get available actions for this invitation
$: availableActions = getAvailableActions(invitation);

// Icon mapping for actions
const _iconMap = {
  Eye,
  Share,
  RefreshCw,
  XCircle,
};

// Handle action execution
async function _handleAction(actionId: string) {
  const success = await executeAction(actionId, invitation);

  if (success) {
    onToggle(); // Close dropdown
    onActionComplete?.(); // Notify parent component
  }
}

// Determine button and menu sizing based on compact mode
$: buttonSize = compact ? 'sm' : 'sm';
$: iconSize = compact ? 'w-3 h-3' : 'w-4 h-4';
$: menuWidth = compact ? 'w-44' : 'w-48';
$: menuTextSize = compact ? 'text-xs' : 'text-sm';
$: menuPadding = compact ? 'px-3 py-2' : 'px-4 py-2';
</script>

<div class="relative">
	<!-- Dropdown Trigger Button -->
	<Button 
		variant={compact ? "ghost" : "outline"}
		size={buttonSize}
		on:click={onToggle}
		class={compact ? "h-6 w-6 p-0" : ""}
		aria-label="Invitation actions"
		aria-expanded={isOpen}
		aria-haspopup="true"
	>
		<MoreVertical class={iconSize} />
	</Button>
	
	<!-- Dropdown Menu -->
	{#if isOpen}
		<div 
			class="absolute right-0 top-8 {menuWidth} bg-white border border-gray-200 rounded-md shadow-lg z-10"
			role="menu"
			aria-orientation="vertical"
		>
			<div class="py-1">
				{#each availableActions as action}
					{@const IconComponent = iconMap[action.icon]}
					<button
						type="button"
						class="flex items-center w-full {menuPadding} {menuTextSize} transition-colors
							{action.destructive 
								? 'text-red-700 hover:bg-red-50' 
								: 'text-gray-700 hover:bg-gray-100'}"
						on:click={() => handleAction(action.id)}
						role="menuitem"
					>
						{#if IconComponent}
							<svelte:component this={IconComponent} class="{iconSize} mr-2" />
						{/if}
						{action.label}
					</button>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Accessibility: Dropdown backdrop for mobile -->
{#if isOpen}
	<div 
		class="fixed inset-0 z-5 md:hidden"
		on:click={onToggle}
		on:keydown={(e) => e.key === 'Escape' && onToggle()}
		role="button"
		tabindex="0"
		aria-label="Close menu"
	></div>
{/if}