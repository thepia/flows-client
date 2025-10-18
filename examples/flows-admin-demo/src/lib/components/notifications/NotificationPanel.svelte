<script lang="ts">
import { notificationService } from '$lib/services/NotificationService';
import type { Notification, NotificationFilter, NotificationStats } from '$lib/types/notifications';
import { Archive, Bell, Check, CheckCheck, Filter, Search, X } from 'lucide-svelte';
import { onDestroy, onMount } from 'svelte';
import NotificationItem from './NotificationItem.svelte';

export let isOpen = false;
export let onClose: (() => void) | undefined = undefined;

let notifications: Notification[] = [];
let stats: NotificationStats | null = null;
let loading = true;
let searchTerm = '';
let activeFilters: NotificationFilter = {};
let showFilters = false;
let unsubscribeNotifications: (() => void) | null = null;
let unsubscribeStats: (() => void) | null = null;

// Filter options
const statusOptions = [
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'archived', label: 'Archived' },
];

const typeOptions = [
  { value: 'onboarding_reminder', label: 'Onboarding' },
  { value: 'document_review', label: 'Document Review' },
  { value: 'task_assignment', label: 'Task Assignment' },
  { value: 'deadline_reminder', label: 'Deadline' },
  { value: 'system_alert', label: 'System Alert' },
];

const priorityOptions = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

$: filteredNotifications = notifications.filter((notification) => {
  const matchesSearch =
    !searchTerm ||
    notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.from.name.toLowerCase().includes(searchTerm.toLowerCase());

  return matchesSearch;
});

onMount(async () => {
  await loadNotifications();
  await loadStats();

  // Subscribe to real-time updates
  unsubscribeNotifications = notificationService.subscribe((newNotification) => {
    notifications = [newNotification, ...notifications];
  });

  unsubscribeStats = notificationService.subscribeToStats((newStats) => {
    stats = newStats;
  });
});

onDestroy(() => {
  if (unsubscribeNotifications) unsubscribeNotifications();
  if (unsubscribeStats) unsubscribeStats();
});

async function loadNotifications() {
  try {
    loading = true;
    notifications = await notificationService.getNotifications(activeFilters);
  } catch (error) {
    console.error('Error loading notifications:', error);
  } finally {
    loading = false;
  }
}

async function loadStats() {
  try {
    stats = await notificationService.getStats(activeFilters);
  } catch (error) {
    console.error('Error loading notification stats:', error);
  }
}

async function markAllAsRead() {
  try {
    await notificationService.markAllAsRead(activeFilters);
    await loadNotifications();
    await loadStats();
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
}

async function archiveAll() {
  try {
    await notificationService.archiveAll(activeFilters);
    await loadNotifications();
    await loadStats();
  } catch (error) {
    console.error('Error archiving all:', error);
  }
}

async function handleNotificationAction(notification: Notification, action: string) {
  try {
    switch (action) {
      case 'mark-read':
        await notificationService.markAsRead(notification.id);
        break;
      case 'mark-unread':
        await notificationService.markAsUnread(notification.id);
        break;
      case 'archive':
        await notificationService.archiveNotification(notification.id);
        break;
      case 'dismiss':
        await notificationService.dismissNotification(notification.id);
        break;
    }
    await loadNotifications();
    await loadStats();
  } catch (error) {
    console.error('Error handling notification action:', error);
  }
}

function applyFilters() {
  loadNotifications();
  loadStats();
}

function clearFilters() {
  activeFilters = {};
  searchTerm = '';
  showFilters = false;
  loadNotifications();
  loadStats();
}

function handleClose() {
  if (onClose) {
    onClose();
  }
}

// Generate demo data if no notifications exist
async function generateDemoData() {
  try {
    await notificationService.generateDemoNotifications(15);
    await loadNotifications();
    await loadStats();
  } catch (error) {
    console.error('Error generating demo data:', error);
  }
}
</script>

{#if isOpen}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-black bg-opacity-25 z-40"
		on:click={handleClose}
		on:keydown={(e) => e.key === 'Escape' && handleClose()}
		aria-label="Close notifications backdrop"
		data-testid="notification-backdrop"
	></div>

	<!-- Panel -->
	<div 
		class="fixed top-16 right-4 w-96 max-h-[80vh] bg-white rounded-lg shadow-xl border border-gray-200 z-50 flex flex-col"
		data-testid="notification-panel"
	>
		<!-- Header -->
		<div class="p-4 border-b border-gray-200">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-medium text-gray-900">
					Notifications
					{#if stats}
						<span class="ml-2 text-sm text-gray-500">
							({stats.unread} unread)
						</span>
					{/if}
				</h3>
				<button
					on:click={handleClose}
					class="p-1 hover:bg-gray-100 rounded"
					data-testid="close-notifications"
				>
					<X class="w-5 h-5 text-gray-500" />
				</button>
			</div>

			<!-- Search -->
			<div class="mt-3 relative">
				<Search class="w-4 h-4 absolute left-3 top-3 text-gray-400" />
				<input
					type="text"
					placeholder="Search notifications..."
					bind:value={searchTerm}
					class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
					data-testid="notification-search"
				/>
			</div>

			<!-- Action buttons -->
			<div class="mt-3 flex items-center justify-between">
				<div class="flex space-x-2">
					<button
						on:click={() => showFilters = !showFilters}
						class="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
						data-testid="toggle-filters"
					>
						<Filter class="w-4 h-4 mr-1" />
						Filters
					</button>
				</div>
				
				<div class="flex space-x-2">
					<button
						on:click={markAllAsRead}
						class="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
						data-testid="mark-all-read"
						disabled={loading || !stats?.unread}
					>
						<CheckCheck class="w-4 h-4 mr-1" />
						Read All
					</button>
					
					<button
						on:click={archiveAll}
						class="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
						data-testid="archive-all"
						disabled={loading}
					>
						<Archive class="w-4 h-4 mr-1" />
						Archive All
					</button>
				</div>
			</div>

			<!-- Filters panel -->
			{#if showFilters}
				<div class="mt-3 p-3 bg-gray-50 rounded border">
					<div class="grid grid-cols-1 gap-3">
						<!-- Status filter -->
						<div>
							<label for="status-filter" class="block text-xs font-medium text-gray-700 mb-1">Status</label>
							<select
								id="status-filter"
								bind:value={activeFilters.status}
								on:change={applyFilters}
								class="w-full text-sm border border-gray-300 rounded px-2 py-1"
							>
								<option value={undefined}>All statuses</option>
								{#each statusOptions as option}
									<option value={[option.value]}>{option.label}</option>
								{/each}
							</select>
						</div>

						<!-- Type filter -->
						<div>
							<label for="type-filter" class="block text-xs font-medium text-gray-700 mb-1">Type</label>
							<select
								id="type-filter"
								bind:value={activeFilters.type}
								on:change={applyFilters}
								class="w-full text-sm border border-gray-300 rounded px-2 py-1"
							>
								<option value={undefined}>All types</option>
								{#each typeOptions as option}
									<option value={[option.value]}>{option.label}</option>
								{/each}
							</select>
						</div>

						<!-- Priority filter -->
						<div>
							<label for="priority-filter" class="block text-xs font-medium text-gray-700 mb-1">Priority</label>
							<select
								id="priority-filter"
								bind:value={activeFilters.priority}
								on:change={applyFilters}
								class="w-full text-sm border border-gray-300 rounded px-2 py-1"
							>
								<option value={undefined}>All priorities</option>
								{#each priorityOptions as option}
									<option value={[option.value]}>{option.label}</option>
								{/each}
							</select>
						</div>

						<div class="flex justify-end">
							<button
								on:click={clearFilters}
								class="text-xs text-blue-600 hover:text-blue-700"
							>
								Clear all filters
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto">
			{#if loading}
				<div class="p-8 text-center">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
					<p class="mt-2 text-sm text-gray-500">Loading notifications...</p>
				</div>
			{:else if filteredNotifications.length === 0}
				<div class="p-8 text-center">
					{#if notifications.length === 0}
						<div class="text-gray-500">
							<Bell class="w-12 h-12 mx-auto mb-3 text-gray-300" />
							<p class="text-sm mb-4">No notifications yet</p>
							<button
								on:click={generateDemoData}
								class="px-4 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
								data-testid="generate-demo-notifications"
							>
								Generate Demo Data
							</button>
						</div>
					{:else}
						<p class="text-sm text-gray-500">No notifications match your search</p>
					{/if}
				</div>
			{:else}
				<div class="divide-y divide-gray-100">
					{#each filteredNotifications as notification (notification.id)}
						<NotificationItem 
							{notification}
							onAction={(action) => handleNotificationAction(notification, action)}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/if}