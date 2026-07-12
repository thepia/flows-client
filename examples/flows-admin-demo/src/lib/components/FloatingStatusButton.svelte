<script lang="ts">
import { Activity, AlertCircle, CheckCircle2, XCircle } from 'lucide-svelte';
import { onMount } from 'svelte';
import { clientStore } from '$lib/stores/domains/client/client.store';

// Status states
let isOpen = false;
let errorReportingConfig: any = null;
let queueSize = 0;
let _lastRefresh = '';
let _isSwitchingClient = false;

// Service status (future)
const authStatus = 'connected'; // 'connected' | 'disconnected' | 'error'
const _serviceWorkerStatus = 'not-supported'; // 'active' | 'installing' | 'waiting' | 'not-supported'
const databaseStatus = 'connected'; // 'connected' | 'disconnected' | 'error'

async function loadSystemStatus() {
  try {
    // Load error reporting status
    const { getAdminErrorReportingConfig } = await import('../config/errorReporting.js');
    const { getAdminErrorReportQueueSize } = await import('../utils/errorReporter');

    errorReportingConfig = await getAdminErrorReportingConfig();
    queueSize = getAdminErrorReportQueueSize();
    _lastRefresh = new Date().toLocaleTimeString();

    // TODO: Add other status checks
    // - Auth status (check if Supabase is connected)
    // - Service worker status
    // - Database connectivity
  } catch (error) {
    console.error('Failed to load system status:', error);
    // Set some default values on error
    errorReportingConfig = {
      enabled: false,
      serverType: 'Error loading config',
      environment: 'unknown',
    };
    queueSize = 0;
  }
}

async function _flushErrorReports() {
  try {
    const { flushAdminErrorReports } = await import('../config/errorReporting.js');
    await flushAdminErrorReports();
    await loadSystemStatus();
  } catch (error) {
    console.error('Failed to flush error reports:', error);
  }
}

async function _testErrorReporting() {
  try {
    const { reportAdminFlowError } = await import('../config/errorReporting.js');
    await reportAdminFlowError('ui-interaction', new Error('Test error from floating status'), {
      test: true,
      timestamp: Date.now(),
    });
    console.log('[Admin Demo] Test error report sent from floating status');
  } catch (error) {
    console.error('Failed to send test error report:', error);
  }
}

function _toggleStatus() {
  console.log('[FloatingStatusButton] Toggle clicked, current isOpen:', isOpen);
  isOpen = !isOpen;
  console.log('[FloatingStatusButton] New isOpen state:', isOpen);
  if (isOpen) {
    loadSystemStatus();
  }
}

onMount(async () => {
  console.log('[FloatingStatusButton] Component mounted');
  loadSystemStatus();

  // Load clients if not already loaded (handled automatically by clientStore)
  try {
    // The clientStore automatically loads clients on mount
    console.log('[FloatingStatusButton] Clients loading handled by clientStore');
    console.log('[FloatingStatusButton] Current clientStore state:', {
      clients: $clientStore.clients,
      currentClient: $clientStore.currentClient,
      loading: $clientStore.loading,
      error: $clientStore.error,
    });
  } catch (error) {
    console.error('[FloatingStatusButton] Failed to load clients:', error);
  }

  // Refresh status every 10 seconds
  const interval = setInterval(loadSystemStatus, 10000);
  return () => clearInterval(interval);
});

// Overall system health indicator
$: overallStatus = (() => {
  if (!errorReportingConfig) return 'loading';

  const hasErrors = queueSize > 0;
  const errorReportingOk = errorReportingConfig?.enabled;
  const authOk = authStatus === 'connected';
  const dbOk = databaseStatus === 'connected';

  if (hasErrors) return 'error';
  if (!errorReportingOk || !authOk || !dbOk) return 'warning';
  return 'good';
})();

$: statusIcon =
  overallStatus === 'good'
    ? CheckCircle2
    : overallStatus === 'warning'
      ? AlertCircle
      : overallStatus === 'error'
        ? XCircle
        : Activity;

$: statusColor =
  overallStatus === 'good'
    ? 'text-green-600'
    : overallStatus === 'warning'
      ? 'text-yellow-600'
      : overallStatus === 'error'
        ? 'text-red-600'
        : 'text-gray-600';

$: ringColor =
  overallStatus === 'good'
    ? 'ring-green-500'
    : overallStatus === 'warning'
      ? 'ring-yellow-500'
      : overallStatus === 'error'
        ? 'ring-red-500'
        : 'ring-gray-500';
</script>

<!-- Floating Status Button -->
<div class="fixed bottom-4 right-4 z-50">
	{#if isOpen}
		<!-- Status Popover -->
		<div class="absolute bottom-16 right-0 w-80 mb-2 max-h-[600px] overflow-y-auto">
			<Card class="shadow-lg border-2">
				<CardHeader class="pb-3">
					<div class="flex items-center justify-between">
						<CardTitle class="flex items-center gap-2 text-sm">
							<svelte:component this={statusIcon} class="w-4 h-4 {statusColor}" />
							System Status
						</CardTitle>
						<Button 
							variant="ghost" 
							size="sm" 
							on:click={toggleStatus}
							class="h-6 w-6 p-0"
						>
							✕
						</Button>
					</div>
					<CardDescription class="text-xs">
						Development environment monitoring
					</CardDescription>
				</CardHeader>
				<CardContent class="space-y-4 text-xs">
					<!-- Error Reporting Status -->
					<div class="space-y-2">
						<h4 class="font-medium text-sm flex items-center gap-2">
							<Zap class="w-3 h-3" />
							Error Reporting
						</h4>
						{#if errorReportingConfig}
							<div class="pl-5 space-y-1">
								<div class="flex justify-between">
									<span class="text-muted-foreground">Status:</span>
									<span class="px-2 py-0.5 text-xs rounded {errorReportingConfig.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
										{errorReportingConfig.enabled ? 'Enabled' : 'Disabled'}
									</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Queue:</span>
									<span class="px-2 py-0.5 text-xs rounded {queueSize > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
										{queueSize} pending
									</span>
								</div>
								<div class="flex justify-between">
									<span class="text-muted-foreground">Endpoint:</span>
									<span class="text-right max-w-[120px] truncate font-mono">{errorReportingConfig.serverType}</span>
								</div>
							</div>
						{:else}
							<div class="pl-5 text-muted-foreground">Loading...</div>
						{/if}
					</div>

					<!-- Authentication Status -->
					<div class="space-y-2">
						<h4 class="font-medium text-sm flex items-center gap-2">
							<User class="w-3 h-3" />
							Authentication
						</h4>
						<div class="pl-5 space-y-1">
							<div class="flex justify-between">
								<span class="text-muted-foreground">Supabase:</span>
								<span class="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">
									Connected
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Mode:</span>
								<span class="text-muted-foreground">Demo/Service Role</span>
							</div>
						</div>
					</div>

					<!-- Database Status -->
					<div class="space-y-2">
						<h4 class="font-medium text-sm flex items-center gap-2">
							<Database class="w-3 h-3" />
							Database
						</h4>
						<div class="pl-5 space-y-1">
							<div class="flex justify-between">
								<span class="text-muted-foreground">Connection:</span>
								<span class="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">
									Connected
								</span>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Client:</span>
								<span class="text-muted-foreground">{$clientStore.currentClient?.client_code || 'Loading...'}</span>
							</div>
						</div>
					</div>

					<!-- Demo Client Switcher -->
					<div class="space-y-2">
						<h4 class="font-medium text-sm flex items-center gap-2">
							<Building2 class="w-3 h-3" />
							Demo Client
						</h4>
						<div class="pl-5 space-y-2">
							{#if $clientStore.clients && $clientStore.clients.length > 0}
								<select
									class="w-full px-2 py-1 text-xs border rounded-md bg-white"
									value={$clientStore.currentClient?.client_id || ''}
									disabled={isSwitchingClient || $clientStore.loading}
									on:change={async (e) => {
										const clientId = e.target.value;
										console.log(`[FloatingStatusButton] User selected client: ${clientId}`);
										
										if (clientId) {
											try {
												isSwitchingClient = true;
												// Ultra-simple: just store in localStorage and refresh
												setCurrentClientId(clientId);
												console.log(`[FloatingStatusButton] Client stored in localStorage, refreshing page`);
												
												// Refresh the page - loadDemoData will use the stored client
												await goto('/', { replaceState: true, invalidateAll: true });
												isOpen = false;
											} catch (error) {
												console.error('[FloatingStatusButton] Failed to switch client:', error);
												alert('Failed to switch client. Please try again.');
											} finally {
												isSwitchingClient = false;
											}
										}
									}}
								>
									{#each $clientStore.clients as c}
										<option value={c.client_id}>
											{c.legal_name} ({c.client_code})
										</option>
									{/each}
								</select>
								{#if isSwitchingClient || $clientStore.loading}
									<div class="text-xs text-blue-600 flex items-center gap-1">
										<RefreshCw class="w-3 h-3 animate-spin" />
										{isSwitchingClient ? 'Switching client...' : 'Loading clients...'}
									</div>
								{:else}
									<div class="text-xs text-muted-foreground">
										{$clientStore.currentClient?.industry || 'No industry set'}
									</div>
								{/if}
							{:else if $clientStore.loading}
								<div class="text-xs text-muted-foreground">Loading clients...</div>
							{:else if $clientStore.error}
								<div class="text-xs text-red-600">Error: {$clientStore.error}</div>
							{:else}
								<div class="text-xs text-muted-foreground">No clients available</div>
							{/if}
						</div>
					</div>

					<!-- Service Worker Status (Future) -->
					<div class="space-y-2">
						<h4 class="font-medium text-sm flex items-center gap-2">
							<Shield class="w-3 h-3" />
							Service Worker
						</h4>
						<div class="pl-5 space-y-1">
							<div class="flex justify-between">
								<span class="text-muted-foreground">Status:</span>
								<span class="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-800">
									Not Implemented
								</span>
							</div>
						</div>
					</div>
					
					<!-- Actions -->
					<div class="flex gap-2 pt-2 border-t">
						<Button 
							variant="outline" 
							size="sm" 
							on:click={loadSystemStatus}
							class="text-xs h-7"
						>
							<RefreshCw class="w-3 h-3 mr-1" />
							Refresh
						</Button>
						
						{#if errorReportingConfig?.enabled}
							<Button 
								variant="outline" 
								size="sm" 
								on:click={testErrorReporting}
								class="text-xs h-7"
							>
								Test Error
							</Button>
							
							{#if queueSize > 0}
								<Button 
									variant="outline" 
									size="sm" 
									on:click={flushErrorReports}
									class="text-xs h-7"
								>
									Flush ({queueSize})
								</Button>
							{/if}
						{/if}
					</div>
					
					{#if lastRefresh}
						<div class="text-muted-foreground text-xs pt-2 border-t">
							Last updated: {lastRefresh}
						</div>
					{/if}
				</CardContent>
			</Card>
		</div>
	{/if}

	<!-- Floating Button -->
	<button 
		on:click={toggleStatus}
		class="w-14 h-14 rounded-full shadow-lg ring-2 {ringColor} ring-offset-2 transition-all hover:scale-105 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
		aria-label="System Status"
	>
		{#if statusIcon}
			<svelte:component this={statusIcon} class="w-6 h-6" />
		{:else}
			<span class="text-xl">🔧</span>
		{/if}
	</button>
</div>

<!-- Click outside to close -->
{#if isOpen}
	<div 
		class="fixed inset-0 z-40"
		on:click={toggleStatus}
		on:keydown={(e) => e.key === 'Escape' && toggleStatus()}
		role="button"
		tabindex="0"
	></div>
{/if}