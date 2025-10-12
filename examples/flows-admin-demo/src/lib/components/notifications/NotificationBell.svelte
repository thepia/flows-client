<script lang="ts">
import { notificationService } from '$lib/services/NotificationService';
import type { NotificationStats } from '$lib/types/notifications';
import { Bell } from 'lucide-svelte';
import { onDestroy, onMount } from 'svelte';

export let onclick: (() => void) | undefined = undefined;
export let size: 'sm' | 'md' | 'lg' = 'md';

let stats: NotificationStats = {
  total: 0,
  unread: 0,
  byType: {} as any,
  byPriority: {} as any,
  byStatus: {} as any,
};
let loading = true;
let unsubscribe: (() => void) | null = null;

const sizeClasses = {
  sm: 'w-5 h-5',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

const badgeSizeClasses = {
  sm: 'text-xs min-w-[16px] h-4 px-1',
  md: 'text-xs min-w-[18px] h-5 px-1.5',
  lg: 'text-sm min-w-[20px] h-6 px-2',
};

onMount(async () => {
  // Load initial stats
  try {
    stats = await notificationService.getStats();
    loading = false;
  } catch (error) {
    console.error('Error loading notification stats:', error);
    loading = false;
  }

  // Subscribe to stats updates
  unsubscribe = notificationService.subscribeToStats((newStats) => {
    stats = newStats;
  });
});

onDestroy(() => {
  if (unsubscribe) {
    unsubscribe();
  }
});

function handleClick() {
  if (onclick) {
    onclick();
  }
}
</script>

<button
	data-testid="notification-bell"
	class="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
	onclick={handleClick}
	disabled={loading}
>
	<Bell class={sizeClasses[size]} />
	
	{#if stats.unread > 0}
		<span 
			data-testid="notification-badge"
			class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full flex items-center justify-center font-medium leading-none {badgeSizeClasses[size]}"
		>
			{stats.unread > 99 ? '99+' : stats.unread}
		</span>
	{/if}
	
	{#if loading}
		<span class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse"></span>
	{/if}
</button>