<script lang="ts">
import { page } from '$app/stores';
import { onMount } from 'svelte';
import { browser } from '$app/environment';
import '../app.pcss';
import AppHeader from '$lib/components/layout/AppHeader.svelte';
import { setupAuthContext } from '@thepia/flows-auth';
import '@thepia/flows-auth/style.css';
import { FlowsClient } from '@thepia/flows-client';
import { initializeSupabaseStores } from '../lib/contexts/supabase-context';

// Determine page context
$: isSettingsPage = $page.url.pathname === '/settings';
$: isAuthTestPage = $page.url.pathname === '/auth-test';
$: pageTitle = isSettingsPage ? 'Settings' : isAuthTestPage ? 'Auth Test' : 'Flows';

// Get flows-client client for session persistence
const flowsDB = new FlowsClient();

// Setup auth context for entire app (SSR disabled, so this is safe)
const authConfig = {
  apiBaseUrl: 'https://api.thepia.com', // Auto-detects local dev server
  clientId: 'demo',
  appCode: 'demo',
  domain: 'thepia.net',
  enablePasskeys: false,
  enableMagicLinks: false,
  branding: {
    companyName: 'Thepia Flows',
    // primaryColor: '#3b82f6'
  },
  // Automatic session persistence via flows-client service worker
  database: flowsDB.session
};

const authStore = setupAuthContext(authConfig);
console.log('🔐 Auth store initialized in layout with database persistence');

// Initialize global Supabase stores that react to auth changes
initializeSupabaseStores(authStore);
console.log('🔗 Global Supabase stores initialized');

// Initialize error reporting and store bridge on app startup
onMount(async () => {
  if (!browser) return;

  try {
    // Initialize error reporting
    const { initializeAdminErrorReporting, enableGlobalAdminErrorReporting } = await import(
      '../lib/config/errorReporting.js'
    );

    await initializeAdminErrorReporting();
    enableGlobalAdminErrorReporting();

    // Initialize store bridge for legacy compatibility
    const { initializeStoreBridge } = await import('../lib/stores/store-bridge');
    initializeStoreBridge();

    console.log('[Admin Demo] Application initialized with error reporting, store bridge, and auth');
  } catch (error) {
    console.error('[Admin Demo] Failed to initialize application:', error);
  }
});
</script>

<div class="min-h-screen bg-gray-50">
	<AppHeader title={pageTitle} showBackButton={isSettingsPage} />
	<main>
		<slot />
	</main>
</div>
