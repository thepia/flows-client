<script lang="ts">
import { AlertCircle, CheckCircle2, XCircle } from 'lucide-svelte';
import { onMount } from 'svelte';

let config: any = null;
let _queueSize = 0;
let _lastRefresh = '';

async function loadErrorReportingStatus() {
  try {
    const { getAdminErrorReportingConfig } = await import('../config/errorReporting.js');
    const { getAdminErrorReportQueueSize } = await import('../utils/errorReporter');

    config = await getAdminErrorReportingConfig();
    _queueSize = getAdminErrorReportQueueSize();
    _lastRefresh = new Date().toLocaleTimeString();
  } catch (error) {
    console.error('Failed to load error reporting status:', error);
  }
}

async function _flushReports() {
  try {
    const { flushAdminErrorReports } = await import('../config/errorReporting.js');
    await flushAdminErrorReports();
    await loadErrorReportingStatus(); // Refresh status
  } catch (error) {
    console.error('Failed to flush error reports:', error);
  }
}

async function _testErrorReporting() {
  try {
    const { reportAdminFlowError } = await import('../config/errorReporting.js');
    await reportAdminFlowError('ui-interaction', new Error('Test error from status component'), {
      test: true,
      timestamp: Date.now(),
    });
    console.log('[Admin Demo] Test error report sent');
  } catch (error) {
    console.error('Failed to send test error report:', error);
  }
}

onMount(() => {
  loadErrorReportingStatus();

  // Refresh status every 5 seconds
  const interval = setInterval(loadErrorReportingStatus, 5000);
  return () => clearInterval(interval);
});

$: statusIcon = config?.enabled
  ? CheckCircle2
  : config?.serverType?.includes('no local servers')
    ? XCircle
    : AlertCircle;

$: statusColor = config?.enabled
  ? 'text-green-600'
  : config?.serverType?.includes('no local servers')
    ? 'text-red-600'
    : 'text-yellow-600';
</script>

<Card class="max-w-md">
	<CardHeader class="pb-3">
		<CardTitle class="flex items-center gap-2 text-sm">
			<svelte:component this={statusIcon} class="w-4 h-4 {statusColor}" />
			Error Reporting Status
		</CardTitle>
		<CardDescription class="text-xs">
			Development error reporting and debugging
		</CardDescription>
	</CardHeader>
	<CardContent class="space-y-3 text-xs">
		{#if config}
			<div class="space-y-2">
				<div class="flex justify-between">
					<span class="text-muted-foreground">Status:</span>
					<span class="px-2 py-1 text-xs rounded {config.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
						{config.enabled ? 'Enabled' : 'Disabled'}
					</span>
				</div>
				
				<div class="flex justify-between">
					<span class="text-muted-foreground">Environment:</span>
					<span>{config.environment}</span>
				</div>
				
				<div class="flex justify-between">
					<span class="text-muted-foreground">Server:</span>
					<span class="text-right max-w-[200px] truncate">{config.serverType}</span>
				</div>
				
				{#if config.endpoint}
					<div class="flex justify-between">
						<span class="text-muted-foreground">Endpoint:</span>
						<span class="text-right max-w-[200px] truncate font-mono">{config.endpoint}</span>
					</div>
				{/if}
				
				<div class="flex justify-between">
					<span class="text-muted-foreground">Queue:</span>
					<span class="px-2 py-1 text-xs rounded {queueSize > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
						{queueSize} pending
					</span>
				</div>
				
				<div class="flex justify-between">
					<span class="text-muted-foreground">Debug:</span>
					<span class="px-2 py-1 text-xs rounded {config.debug ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
						{config.debug ? 'On' : 'Off'}
					</span>
				</div>
			</div>
			
			<div class="flex gap-2 pt-2 border-t">
				<Button 
					variant="outline" 
					size="sm" 
					on:click={loadErrorReportingStatus}
					class="text-xs h-7"
				>
					<RefreshCw class="w-3 h-3 mr-1" />
					Refresh
				</Button>
				
				{#if config.enabled}
					<Button 
						variant="outline" 
						size="sm" 
						on:click={testErrorReporting}
						class="text-xs h-7"
					>
						Test Report
					</Button>
					
					{#if queueSize > 0}
						<Button 
							variant="outline" 
							size="sm" 
							on:click={flushReports}
							class="text-xs h-7"
						>
							Flush ({queueSize})
						</Button>
					{/if}
				{/if}
			</div>
			
			{#if lastRefresh}
				<div class="text-muted-foreground text-xs">
					Last updated: {lastRefresh}
				</div>
			{/if}
		{:else}
			<div class="text-muted-foreground">Loading status...</div>
		{/if}
	</CardContent>
</Card>