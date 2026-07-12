<script lang="ts">
import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-svelte';
import type { DemoAction } from '$lib/types';

// Get status icon and color for actions
function _getActionStatusDisplay(action: DemoAction) {
  switch (action.status) {
    case 'completed':
      return { icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-50' };
    case 'running':
      return { icon: Loader2, color: 'text-blue-600', bgColor: 'bg-blue-50' };
    case 'error':
      return { icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50' };
    default:
      return { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-50' };
  }
}

function _getActionTypeLabel(type: string) {
  switch (type) {
    case 'generate':
      return 'Data Generation';
    case 'reset':
      return 'Data Reset';
    case 'export':
      return 'Data Export';
    case 'import':
      return 'Data Import';
    default:
      return type;
  }
}

function _formatTime(dateString: string) {
  return new Date(dateString).toLocaleTimeString();
}

function _formatDuration(startedAt: string, completedAt?: string) {
  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();
  const durationMs = end.getTime() - start.getTime();
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}
</script>

{#if $runningActions.length > 0 || $recentActions.length > 0}
	<Card>
		<CardHeader>
			<CardTitle class="text-base flex items-center">
				<Activity class="w-4 h-4 mr-2" />
				Demo Activity
			</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Running Actions -->
			{#if $runningActions.length > 0}
				<div>
					<h4 class="text-sm font-medium text-gray-900 mb-2">Active Operations</h4>
					<div class="space-y-2">
						{#each $runningActions as action}
							{@const statusDisplay = getActionStatusDisplay(action)}
							<div class="border rounded-lg p-3 {statusDisplay.bgColor}">
								<div class="flex items-center justify-between mb-2">
									<div class="flex items-center">
										<svelte:component 
											this={statusDisplay.icon} 
											class="w-4 h-4 {statusDisplay.color} {action.status === 'running' ? 'animate-spin' : ''} mr-2" 
										/>
										<span class="text-sm font-medium text-gray-900">
											{getActionTypeLabel(action.type)}
										</span>
									</div>
									<span class="text-xs text-gray-500">
										{action.progress}%
									</span>
								</div>
								
								<!-- Progress bar -->
								<div class="w-full bg-gray-200 rounded-full h-2 mb-2">
									<div 
										class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
										style="width: {action.progress}%"
									></div>
								</div>
								
								<p class="text-xs text-gray-600">{action.message}</p>
								
								{#if action.companyId}
									<p class="text-xs text-gray-500 mt-1">
										Company: {action.companyId}
									</p>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Recent Actions -->
			{#if $recentActions.length > 0}
				<div>
					<h4 class="text-sm font-medium text-gray-900 mb-2">Recent Activity</h4>
					<div class="space-y-2">
						{#each $recentActions.slice(0, 5) as action}
							{@const statusDisplay = getActionStatusDisplay(action)}
							<div class="flex items-center justify-between py-2 px-3 border rounded-lg">
								<div class="flex items-center">
									<svelte:component 
										this={statusDisplay.icon} 
										class="w-4 h-4 {statusDisplay.color} mr-3" 
									/>
									<div>
										<p class="text-sm font-medium text-gray-900">
											{getActionTypeLabel(action.type)}
										</p>
										{#if action.companyId}
											<p class="text-xs text-gray-500">{action.companyId}</p>
										{/if}
									</div>
								</div>
								
								<div class="text-right">
									<p class="text-xs text-gray-500">
										{formatTime(action.startedAt)}
									</p>
									{#if action.completedAt}
										<p class="text-xs text-gray-400">
											{formatDuration(action.startedAt, action.completedAt)}
										</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>
{/if}