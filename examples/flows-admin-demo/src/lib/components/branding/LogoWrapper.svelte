<script lang="ts">
import { onMount } from 'svelte';
import { getBrandingForClient, getBrandingLogo } from '$lib/services/brandingRegistry';
import { client } from '$lib/stores/data';

// Props
export const variant: 'square' | 'horizontal' = 'square';
export const className: string = '';

let _logoUrl: string | null = null;
let _loading = true;

// Load logo when client changes
$: if ($client) {
  loadClientLogo($client.code);
}

async function loadClientLogo(clientCode: string) {
  _loading = true;
  try {
    const brandingConfig = getBrandingForClient(clientCode);
    _logoUrl = await getBrandingLogo(brandingConfig, variant);
  } catch (error) {
    console.warn('Failed to load client logo:', error);
    _logoUrl = null;
  } finally {
    _loading = false;
  }
}

onMount(() => {
  // Load default logo on mount if no client is set
  if (!$client) {
    loadClientLogo('default');
  }
});
</script>

{#if loading}
	<!-- Loading state -->
	<div class="w-full h-full flex items-center justify-center bg-gray-200 rounded {variant === 'square' ? '' : 'px-2'} {className} animate-pulse">
		<div class="w-4 h-4 bg-gray-400 rounded"></div>
	</div>
{:else if logoUrl}
	<!-- Client-specific logo -->
	<img 
		src={logoUrl} 
		alt="Logo" 
		class="w-full h-full object-contain {className}"
	/>
{:else}
	<!-- Fallback logo -->
	<div class="w-full h-full flex items-center justify-center bg-blue-600 rounded {variant === 'square' ? '' : 'px-2'} {className}">
		<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
			<path d="M3 3h6v6H3V3zm8 0h6v6h-6V3zM3 11h6v6H3v-6zm8 0h6v6h-6v-6z"/>
		</svg>
	</div>
{/if}