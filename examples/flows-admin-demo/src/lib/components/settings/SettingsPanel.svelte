<script lang="ts">
import { onMount } from 'svelte';
import { applyBrandingToDocument, getBrandingForClient } from '$lib/services/brandingRegistry';
import { clients, loadAllClients, loadClientData } from '$lib/stores/data';
import { getAvailableClients, settings, settingsStore } from '$lib/stores/settings';
import type { BrandingConfig } from '$lib/types';

// Component state
let newBrandingName = '';
let newBrandingPath = '';
let newBrandingType: 'package' | 'local' = 'package';
let _showAddBranding = false;
let initialized = false;
let _loadingClientData = false;
let _activeTab = 'settings'; // 'settings' or 'demo'

// Initialize settings on mount
onMount(async () => {
  // Initialize settings first
  settingsStore.init();

  // Load all clients so they're available for selection
  await loadAllClients();

  // Mark as initialized
  initialized = true;
});

// Track the last loaded client to avoid re-loading
let lastLoadedClientId = '';

// Load data for selected client when settings change
$: if (
  initialized &&
  $settings?.selectedClient &&
  $settings.selectedClient !== lastLoadedClientId
) {
  lastLoadedClientId = $settings.selectedClient;

  // Find the client by code to get the database ID
  const clientToLoad = $clients.find((c) => c.code === $settings.selectedClient);
  if (clientToLoad) {
    loadClientData(clientToLoad.id).catch((error) => {
      console.error('Failed to load selected client data:', error);
    });
  }
}

// Reactive available clients (with safety checks)
$: availableClients = $clients && $settings ? getAvailableClients($clients, $settings) : [];

// Handle branding selection
function _handleBrandingChange(brandingId: string) {
  settingsStore.selectBranding(brandingId);
}

// Handle client selection
async function _handleClientChange(clientCode: string) {
  // Find the client by code to get the database ID
  const selectedClient = $clients.find((c) => c.code === clientCode);
  if (!selectedClient) {
    console.error('Client not found:', clientCode);
    return;
  }

  // Store client code in settings (not database ID)
  settingsStore.selectClient(clientCode);

  // Also load the data for this client using database ID
  _loadingClientData = true;
  try {
    await loadClientData(selectedClient.id);

    // Apply client-specific branding if available
    const clientBranding = getBrandingForClient(selectedClient.code);
    if (clientBranding) {
      // Update the branding selection in settings
      settingsStore.selectBranding(clientBranding.id);

      // Apply the branding to the document
      await applyBrandingToDocument(clientBranding);

      console.log(`Applied branding for ${selectedClient.name}:`, clientBranding.displayName);
    }
  } catch (error) {
    console.error('Failed to load client data:', error);
  } finally {
    _loadingClientData = false;
  }
}

// Manual data loading function
async function _loadSelectedClientData() {
  if (!$settings?.selectedClient) return;

  _loadingClientData = true;
  try {
    await loadClientData($settings.selectedClient);
  } catch (error) {
    console.error('Failed to load client data:', error);
  } finally {
    _loadingClientData = false;
  }
}

// Handle real clients toggle
function _handleRealClientsToggle(checked: boolean) {
  settingsStore.toggleRealClients(checked);
}

// Add new branding
function _addNewBranding() {
  if (!newBrandingName.trim() || !newBrandingPath.trim()) return;

  const branding: BrandingConfig = {
    id: newBrandingName.toLowerCase().replace(/\s+/g, '-'),
    name: newBrandingName,
    displayName: newBrandingName,
    type: newBrandingType,
    path: newBrandingPath,
  };

  settingsStore.addBranding(branding);

  // Reset form
  newBrandingName = '';
  newBrandingPath = '';
  newBrandingType = 'package';
  _showAddBranding = false;
}

// Remove branding
function _removeBranding(brandingId: string) {
  if (confirm('Are you sure you want to remove this branding configuration?')) {
    settingsStore.removeBranding(brandingId);
  }
}

// Reset settings
function _resetSettings() {
  if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    settingsStore.reset();
  }
}

// Format last updated date
function _formatLastUpdated(dateString: string) {
  return new Date(dateString).toLocaleString();
}
</script>

{#if initialized && $settings}
<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<div class="space-y-6">
		<!-- Tab Navigation -->
		<div>
			<div class="border-b border-gray-200">
				<nav class="-mb-px flex space-x-8">
					<button
						on:click={() => activeTab = 'settings'}
						class="py-2 px-1 border-b-2 font-medium text-sm {
							activeTab === 'settings' 
								? 'border-blue-500 text-blue-600' 
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
						}"
					>
						<Settings class="w-4 h-4 mr-2 inline" />
						Demo Settings
					</button>
					<button
						on:click={() => activeTab = 'demo'}
						class="py-2 px-1 border-b-2 font-medium text-sm {
							activeTab === 'demo' 
								? 'border-blue-500 text-blue-600' 
								: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
						}"
					>
						<Database class="w-4 h-4 mr-2 inline" />
						Demo Management
					</button>
				</nav>
			</div>
		</div>

	<!-- Tab Content -->
	{#if activeTab === 'settings'}
		{#if $settingsError}
			<Card class="border-red-200 bg-red-50">
				<CardContent class="pt-4">
					<div class="flex items-center text-red-800">
						<AlertTriangle class="w-5 h-5 mr-2" />
						<span>Settings Error: {$settingsError}</span>
						<Button variant="ghost" size="sm" on:click={() => settingsStore.clearError()} class="ml-auto">
							Dismiss
						</Button>
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Settings Header with Reset Button -->
		<div class="flex items-center justify-between mb-6">
			<div>
				<h2 class="text-xl font-semibold text-gray-900">Demo Configuration</h2>
				<p class="text-sm text-gray-500 mt-1">Configure branding, client selection, and demo preferences</p>
			</div>
			<Button variant="outline" size="sm" on:click={resetSettings}>
				<RotateCcw class="w-4 h-4 mr-2" />
				Reset to Defaults
			</Button>
		</div>

		<!-- Branding Configuration -->
		<Card>
			<CardHeader>
				<CardTitle class="flex items-center">
					<Palette class="w-5 h-5 mr-2" />
					Branding Configuration
				</CardTitle>
				<CardDescription>
					Select the branding package or local directory to use for the demo interface
				</CardDescription>
			</CardHeader>
		<CardContent class="space-y-4">
			<!-- Client Branding Notice -->
			<div class="p-3 bg-blue-50 border border-blue-200 rounded-lg">
				<div class="flex items-start space-x-2">
					<div class="flex-shrink-0">
						<svg class="w-5 h-5 text-blue-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
						</svg>
					</div>
					<div class="flex-1">
						<p class="text-sm text-blue-800">
							<strong>Automatic Client Branding:</strong> When you select a client with custom branding 
							(Hygge & Hvidløg or Meridian Brands), their branding will be automatically applied.
						</p>
					</div>
				</div>
			</div>

			<!-- Current Selection -->
			<div>
				<label for="selected-branding" class="block text-sm font-medium text-gray-700 mb-2">
					Selected Branding
				</label>
				<select 
					id="selected-branding"
					value={$settings?.selectedBranding || ''}
					on:change={(e) => handleBrandingChange(e.target.value)}
					class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
				>
					<option value="">Select branding...</option>
					{#each ($settings?.availableBrandings || []) as branding}
						<option value={branding.id}>
							{branding.displayName} ({branding.type})
							{branding.isDefault ? ' - Default' : ''}
						</option>
					{/each}
				</select>
			</div>

			<!-- Current Branding Details -->
			{#if $selectedBranding}
				<div class="p-3 bg-gray-50 rounded-lg space-y-3">
					<div class="grid grid-cols-2 gap-4 text-sm">
						<div>
							<span class="font-medium text-gray-700">Path:</span>
							<span class="ml-2 font-mono text-gray-600">{$selectedBranding.path}</span>
						</div>
						<div>
							<span class="font-medium text-gray-700">Type:</span>
							<span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
								{$selectedBranding.type}
							</span>
						</div>
					</div>
					
					<!-- Show which clients use this branding -->
					{#if $selectedBranding.id === 'hygge-hvidlog' || $selectedBranding.id === 'meridian-brands'}
						{@const associatedClient = $clients.find(c => c.code === $selectedBranding.id)}
						{#if associatedClient}
							<div class="pt-2 border-t border-gray-200">
								<div class="text-sm">
									<span class="font-medium text-gray-700">Associated Client:</span>
									<span class="ml-2 text-gray-600">{associatedClient.name}</span>
								</div>
								{#if $selectedBranding.id === 'hygge-hvidlog'}
									<div class="flex items-center space-x-2 mt-2">
										<span class="text-xs text-gray-500">Theme Colors:</span>
										<div class="flex space-x-1">
											<div class="w-4 h-4 rounded bg-[#2D5A3D]" title="Forest Green"></div>
											<div class="w-4 h-4 rounded bg-[#F4E4BC]" title="Warm Cream"></div>
											<div class="w-4 h-4 rounded bg-[#D4A574]" title="Golden Wheat"></div>
										</div>
									</div>
								{:else if $selectedBranding.id === 'meridian-brands'}
									<div class="flex items-center space-x-2 mt-2">
										<span class="text-xs text-gray-500">Theme Colors:</span>
										<div class="flex space-x-1">
											<div class="w-4 h-4 rounded bg-[#1A237E]" title="Deep Indigo"></div>
											<div class="w-4 h-4 rounded bg-[#FF6B35]" title="Vibrant Orange"></div>
											<div class="w-4 h-4 rounded bg-[#37474F]" title="Sophisticated Gray"></div>
										</div>
									</div>
								{/if}
							</div>
						{/if}
					{/if}
				</div>
			{/if}

			<hr class="border-gray-200" />

			<!-- Available Brandings -->
			<div>
				<div class="flex items-center justify-between mb-3">
					<label class="text-sm font-medium text-gray-700">Available Brandings</label>
					<Button variant="outline" size="sm" on:click={() => showAddBranding = !showAddBranding}>
						<Plus class="w-4 h-4 mr-1" />
						Add Custom
					</Button>
				</div>

				<div class="space-y-2">
					{#each ($settings?.availableBrandings || []) as branding}
						{@const isClientBranding = branding.id === 'hygge-hvidlog' || branding.id === 'meridian-brands'}
						{@const associatedClient = isClientBranding ? $clients.find(c => c.code === branding.id) : null}
						<div class="flex items-center justify-between p-3 border rounded-lg {
							branding.id === $settings?.selectedBranding ? 'border-blue-500 bg-blue-50' : ''
						}">
							<div class="flex-1">
								<div class="flex items-center space-x-2">
									<div class="font-medium">{branding.displayName}</div>
									{#if associatedClient}
										<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
											<Building2 class="w-3 h-3 mr-1" />
											Client Branding
										</span>
									{/if}
								</div>
								<div class="text-sm text-gray-500 font-mono">{branding.path}</div>
								{#if associatedClient}
									<div class="text-xs text-gray-600 mt-1">
										Used by: {associatedClient.name}
									</div>
								{/if}
								
								<!-- Color preview for client brandings -->
								{#if branding.id === 'hygge-hvidlog'}
									<div class="flex items-center space-x-2 mt-2">
										<span class="text-xs text-gray-500">Colors:</span>
										<div class="flex space-x-1">
											<div class="w-3 h-3 rounded bg-[#2D5A3D]" title="Forest Green"></div>
											<div class="w-3 h-3 rounded bg-[#F4E4BC]" title="Warm Cream"></div>
											<div class="w-3 h-3 rounded bg-[#D4A574]" title="Golden Wheat"></div>
										</div>
									</div>
								{:else if branding.id === 'meridian-brands'}
									<div class="flex items-center space-x-2 mt-2">
										<span class="text-xs text-gray-500">Colors:</span>
										<div class="flex space-x-1">
											<div class="w-3 h-3 rounded bg-[#1A237E]" title="Deep Indigo"></div>
											<div class="w-3 h-3 rounded bg-[#FF6B35]" title="Vibrant Orange"></div>
											<div class="w-3 h-3 rounded bg-[#37474F]" title="Sophisticated Gray"></div>
										</div>
									</div>
								{/if}
							</div>
							<div class="flex items-center space-x-2">
								<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
									{branding.type}
								</span>
								{#if branding.isDefault}
									<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
										default
									</span>
								{:else if !isClientBranding}
									<Button 
										variant="ghost" 
										size="sm" 
										on:click={() => removeBranding(branding.id)}
										class="text-red-600 hover:text-red-700"
									>
										<Trash2 class="w-4 h-4" />
									</Button>
								{/if}
							</div>
						</div>
					{/each}
				</div>

				<!-- Add Branding Form -->
				{#if showAddBranding}
					<div class="mt-4 p-4 border rounded-lg bg-gray-50">
						<div class="space-y-3">
							<div>
								<label for="new-branding-name" class="block text-sm font-medium text-gray-700 mb-1">
									Display Name
								</label>
								<input 
									id="new-branding-name"
									type="text"
									bind:value={newBrandingName} 
									placeholder="e.g., My Custom Branding"
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
							<div>
								<label for="new-branding-type" class="block text-sm font-medium text-gray-700 mb-1">
									Type
								</label>
								<select 
									id="new-branding-type"
									bind:value={newBrandingType}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								>
									<option value="package">NPM Package</option>
									<option value="local">Local Directory</option>
								</select>
							</div>
							<div>
								<label for="new-branding-path" class="block text-sm font-medium text-gray-700 mb-1">
									{newBrandingType === 'package' ? 'Package Name' : 'Local Path'}
								</label>
								<input 
									id="new-branding-path"
									type="text"
									bind:value={newBrandingPath} 
									placeholder={newBrandingType === 'package' ? '@company/branding' : '/path/to/branding'}
									class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								/>
							</div>
							<div class="flex space-x-2">
								<Button on:click={addNewBranding} disabled={!newBrandingName.trim() || !newBrandingPath.trim()}>
									<Save class="w-4 h-4 mr-1" />
									Add Branding
								</Button>
								<Button variant="outline" on:click={() => showAddBranding = false}>
									Cancel
								</Button>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</CardContent>
	</Card>

	<!-- Client Selection -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center">
				<Building2 class="w-5 h-5 mr-2" />
				Client Selection
			</CardTitle>
			<CardDescription>
				Choose which client data to display in the demo
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<!-- Real Clients Access -->
			<div class="flex items-center space-x-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
				<input 
					id="allow-real-clients"
					type="checkbox"
					checked={$settings?.allowRealClients || false}
					on:change={(e) => handleRealClientsToggle(e.target.checked)}
					class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
				/>
				<div>
					<label for="allow-real-clients" class="font-medium text-yellow-800">
						Allow Real Client Data
					</label>
					<p class="text-sm text-yellow-700">
						Enable access to production client data (use with caution)
					</p>
				</div>
			</div>

			<!-- Client Selection -->
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-3">
					Selected Client
				</label>
				
				<!-- Rich Client Cards -->
				<div class="grid grid-cols-1 gap-3">
					{#each availableClients as client}
						{@const isSelected = $settings?.selectedClient === client.code}
						{@const isDetailedDemo = client.code === 'hygge-hvidlog' || client.code === 'meridian-brands'}
						<button
							type="button"
							on:click={() => handleClientChange(client.code)}
							class="text-left p-4 border rounded-lg transition-all duration-200 hover:shadow-md {
								isSelected 
									? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' 
									: 'border-gray-200 hover:border-gray-300'
							}"
						>
							<div class="flex items-start justify-between">
								<div class="flex-1">
									<div class="flex items-center space-x-2 mb-2">
										<h3 class="font-medium text-gray-900">{client.name}</h3>
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
											client.tier === 'enterprise' ? 'bg-purple-100 text-purple-800' :
											client.tier === 'pro' ? 'bg-blue-100 text-blue-800' :
											'bg-gray-100 text-gray-800'
										}">
											{client.tier}
										</span>
										<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {
											client.status === 'active' ? 'bg-green-100 text-green-800' :
											'bg-red-100 text-red-800'
										}">
											{client.status}
										</span>
									</div>
									
									<div class="text-sm text-gray-600 mb-2">
										<span class="font-mono">{client.code}</span>
										{#if client.region}
											• <span class="uppercase">{client.region}</span>
										{/if}
									</div>
									
									<!-- Enhanced information for detailed demo companies -->
									{#if isDetailedDemo}
										<div class="text-sm text-gray-500 space-y-1">
											{#if client.code === 'hygge-hvidlog'}
												<div class="flex items-center space-x-1">
													<span>🌱</span>
													<span>Sustainable Food Technology</span>
												</div>
												<div>Danish company • 1,200 employees • Multilingual onboarding</div>
												<div class="flex items-center space-x-2 mt-1">
													<Palette class="w-3 h-3" />
													<span class="text-xs">Custom branding • Forest green theme</span>
													<div class="flex space-x-1">
														<div class="w-3 h-3 rounded-full bg-[#2D5A3D]" title="Primary color"></div>
														<div class="w-3 h-3 rounded-full bg-[#F4E4BC]" title="Secondary color"></div>
														<div class="w-3 h-3 rounded-full bg-[#D4A574]" title="Accent color"></div>
													</div>
												</div>
											{:else if client.code === 'meridian-brands'}
												<div class="flex items-center space-x-1">
													<span>🏢</span>
													<span>Consumer Products & Lifestyle Brands</span>
												</div>
												<div>Singapore HQ • 15,500 employees • High-velocity operations</div>
												<div class="flex items-center space-x-2 mt-1">
													<Palette class="w-3 h-3" />
													<span class="text-xs">Custom branding • Indigo corporate theme</span>
													<div class="flex space-x-1">
														<div class="w-3 h-3 rounded-full bg-[#1A237E]" title="Primary color"></div>
														<div class="w-3 h-3 rounded-full bg-[#FF6B35]" title="Secondary color"></div>
														<div class="w-3 h-3 rounded-full bg-[#37474F]" title="Accent color"></div>
													</div>
												</div>
											{/if}
										</div>
									{:else}
										<div class="text-sm text-gray-500">
											Demo client • Basic configuration • Default branding
										</div>
									{/if}
								</div>
								
								<!-- Selection indicator -->
								{#if isSelected}
									<div class="flex-shrink-0 ml-3">
										<div class="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
											<svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
												<path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/>
											</svg>
										</div>
									</div>
								{/if}
							</div>
						</button>
					{/each}
					
					{#if availableClients.length === 0}
						<div class="text-center py-8 text-gray-500">
							<Building2 class="w-8 h-8 mx-auto mb-2 opacity-50" />
							<p>No clients available</p>
							<p class="text-sm">Try enabling real client access or check database connection</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Selected Client & Branding Summary -->
			{#if $settings?.selectedClient}
				{@const selectedClient = $clients.find(c => c.code === $settings.selectedClient)}
				{#if selectedClient}
					<div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<h4 class="font-medium text-blue-900">Currently Selected</h4>
								<p class="text-sm text-blue-700">
									{selectedClient.name} • {$selectedBranding?.displayName || 'Default branding'}
								</p>
							</div>
							<Button 
								variant="outline" 
								size="sm" 
								on:click={loadSelectedClientData}
								disabled={loadingClientData}
							>
								{#if loadingClientData}
									<div class="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
									Loading...
								{:else}
									<Database class="w-4 h-4 mr-2" />
									Reload Data
								{/if}
							</Button>
						</div>
					</div>
				{/if}
			{/if}

			<!-- Available Clients Summary -->
			<div class="text-sm text-gray-600 text-center">
				Showing {availableClients.length} available client{availableClients.length !== 1 ? 's' : ''}
				{#if !($settings?.allowRealClients || false)}
					(demo/test clients only)
				{/if}
			</div>
		</CardContent>
	</Card>

	<!-- Settings Info -->
	<Card>
		<CardHeader>
			<CardTitle class="text-base">Settings Information</CardTitle>
		</CardHeader>
		<CardContent>
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div>
					<span class="font-medium text-gray-700">Last Updated:</span>
					<span class="ml-2 text-gray-600">
						{$settings?.lastUpdated ? formatLastUpdated($settings.lastUpdated) : 'Not available'}
					</span>
				</div>
				<div>
					<span class="font-medium text-gray-700">Storage:</span>
					<span class="ml-2 text-gray-600">Browser localStorage</span>
				</div>
			</div>
		</CardContent>
	</Card>
	{:else if activeTab === 'demo'}
		<!-- Demo Management Panel -->
		<DemoManagementPanel />
	{/if}
	</div>
</div>
{:else}
<!-- Loading state -->
<div class="flex items-center justify-center py-16">
	<div class="text-center">
		<div class="w-8 h-8 bg-blue-500 rounded-full animate-bounce mx-auto mb-4"></div>
		<p class="text-gray-600">Loading settings...</p>
	</div>
</div>
{/if}