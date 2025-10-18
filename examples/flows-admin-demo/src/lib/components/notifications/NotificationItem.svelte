<script lang="ts">
import type { Notification } from '$lib/types/notifications';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Archive,
  Check,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  FileText,
  MoreHorizontal,
  Settings,
  User,
  Users,
  X,
} from 'lucide-svelte';

export let notification: Notification;
export let onAction: ((action: string) => void) | undefined = undefined;

let showActions = false;

// Priority colors
const priorityColors = {
  urgent: 'border-red-500 bg-red-50',
  high: 'border-orange-500 bg-orange-50',
  medium: 'border-blue-500 bg-blue-50',
  low: 'border-gray-300 bg-gray-50',
};

const priorityTextColors = {
  urgent: 'text-red-700',
  high: 'text-orange-700',
  medium: 'text-blue-700',
  low: 'text-gray-700',
};

// Type icons
const typeIcons = {
  onboarding_reminder: User,
  document_review: FileText,
  task_assignment: CheckCircle,
  process_update: Settings,
  deadline_reminder: Clock,
  system_alert: AlertCircle,
  invitation_sent: Users,
  completion_milestone: CheckCircle,
  manager_action_required: User,
  hr_review_needed: Users,
};

$: isUnread = notification.status === 'unread';
$: timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true });
$: TypeIcon = typeIcons[notification.type] || AlertCircle;

function handleAction(action: string) {
  if (onAction) {
    onAction(action);
  }
  showActions = false;
}

function handlePrimaryAction() {
  if (notification.actions && notification.actions.length > 0) {
    const primaryAction = notification.actions.find((a) => a.type === 'primary');
    if (primaryAction?.href) {
      window.location.href = primaryAction.href;
    }
  }

  // Mark as read when clicking
  if (isUnread) {
    handleAction('mark-read');
  }
}
</script>

<div 
	class="p-4 hover:bg-gray-50 transition-colors duration-150 {isUnread ? 'bg-blue-50' : ''}"
	data-testid="notification-item-{notification.id}"
>
	<div class="flex items-start space-x-3">
		<!-- Avatar/Icon -->
		<div class="flex-shrink-0">
			{#if notification.from.avatar}
				<div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
					{notification.from.avatar}
				</div>
			{:else}
				<div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
					<TypeIcon class="w-4 h-4 text-gray-600" />
				</div>
			{/if}
		</div>

		<!-- Content -->
		<div class="flex-1 min-w-0">
			<div class="flex items-start justify-between">
				<div class="flex-1">
					<!-- Title and priority -->
					<div class="flex items-center space-x-2">
						<h4 class="text-sm font-medium text-gray-900 {isUnread ? 'font-semibold' : ''}">
							{notification.title}
						</h4>
						<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border {priorityColors[notification.priority]} {priorityTextColors[notification.priority]}">
							{notification.priority}
						</span>
						{#if isUnread}
							<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
						{/if}
					</div>

					<!-- Message -->
					<p class="mt-1 text-sm text-gray-600 line-clamp-2">
						{notification.message}
					</p>

					<!-- Meta info -->
					<div class="mt-2 flex items-center text-xs text-gray-500 space-x-4">
						<span>From: {notification.from.name}</span>
						<span>{timeAgo}</span>
						{#if notification.readAt}
							<span class="flex items-center">
								<Eye class="w-3 h-3 mr-1" />
								Read
							</span>
						{/if}
					</div>

					<!-- Actions -->
					{#if notification.actions && notification.actions.length > 0}
						<div class="mt-3 flex space-x-2">
							{#each notification.actions as action}
								{#if action.type === 'primary'}
									<button
										on:click={handlePrimaryAction}
										class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
										data-testid="notification-action-{action.id}"
									>
										{action.label}
									</button>
								{:else}
									<button
										on:click={() => action.href && (window.location.href = action.href)}
										class="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
										data-testid="notification-action-{action.id}"
									>
										{action.label}
									</button>
								{/if}
							{/each}
						</div>
					{/if}
				</div>

				<!-- More actions menu -->
				<div class="relative">
					<button
						on:click={() => showActions = !showActions}
						class="p-1 hover:bg-gray-100 rounded transition-colors duration-150"
						data-testid="notification-menu-{notification.id}"
					>
						<MoreHorizontal class="w-4 h-4 text-gray-500" />
					</button>

					{#if showActions}
						<div class="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
							<div class="py-1">
								{#if isUnread}
									<button
										on:click={() => handleAction('mark-read')}
										class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
										data-testid="mark-read-{notification.id}"
									>
										<Check class="w-4 h-4 mr-2" />
										Mark as read
									</button>
								{:else}
									<button
										on:click={() => handleAction('mark-unread')}
										class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
										data-testid="mark-unread-{notification.id}"
									>
										<EyeOff class="w-4 h-4 mr-2" />
										Mark as unread
									</button>
								{/if}
								
								<button
									on:click={() => handleAction('archive')}
									class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
									data-testid="archive-{notification.id}"
								>
									<Archive class="w-4 h-4 mr-2" />
									Archive
								</button>
								
								<button
									on:click={() => handleAction('dismiss')}
									class="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
									data-testid="dismiss-{notification.id}"
								>
									<X class="w-4 h-4 mr-2" />
									Dismiss
								</button>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Close menu when clicking outside -->
{#if showActions}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-0"
		on:click={() => showActions = false}
		on:keydown={(e) => e.key === 'Escape' && (showActions = false)}
		aria-label="Close menu overlay"
	></div>
{/if}