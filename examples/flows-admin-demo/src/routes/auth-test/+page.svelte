<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { getAuthStoreFromContext, SignInForm } from '@thepia/flows-auth';

	// Get auth store from context (set up in +layout.svelte)
	const authStore = getAuthStoreFromContext();

	// Import IndexedDB constants
	let INDEXEDDB_NAME: string;
	let INDEXEDDB_VERSION: number;

	let authState = $state({
		isAuthenticated: false,
		isLoading: false,
		error: null as string | null,
		session: null as any
	});
	let flowsDB = $state<any>(null);
	let indexedDBData = $state({
		users: [] as any[],
		sessions: [] as any[],
		loading: false,
		error: null as string | null
	});
	let isLoadingDB = false; // Guard against concurrent loads

	onMount(async () => {
		if (!browser) return;

		try {
			// Import IndexedDB constants dynamically
			const clientModule = await import('@thepia/flows-db/client');
			console.log('[Auth Test] Loaded client module:', clientModule);
			INDEXEDDB_NAME = clientModule.INDEXEDDB_NAME;
			INDEXEDDB_VERSION = clientModule.INDEXEDDB_VERSION;
			console.log('[Auth Test] Constants loaded:', { INDEXEDDB_NAME, INDEXEDDB_VERSION });

			// Subscribe to auth state changes
			authStore.subscribe((state: any) => {
				const wasAuthenticated = authState.isAuthenticated;
				authState = {
					isAuthenticated: state.isAuthenticated,
					isLoading: state.isLoading,
					error: state.error,
					session: state.session
				};

				// Reload IndexedDB data when auth state changes
				if (wasAuthenticated !== state.isAuthenticated) {
					setTimeout(() => loadIndexedDBData(), 500);
				}
			});

			// Get flows-db client
			const { getFlowsDB } = await import('@thepia/flows-db/client');
			flowsDB = getFlowsDB();

			// Wait for service worker to be ready before accessing IndexedDB
			if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
				console.log('[Auth Test] Service Worker is active, waiting for it to be ready...');
				await navigator.serviceWorker.ready;
				console.log('[Auth Test] Service Worker ready!');
			}

			// Initial load of IndexedDB data - wait longer to ensure SW has initialized DB
			setTimeout(() => loadIndexedDBData(), 2000);
		} catch (err) {
			console.error('[Auth Test] Failed to initialize:', err);
			authState.error = err instanceof Error ? err.message : 'Failed to initialize';
		}
	});

	async function handleSignOut() {
		try {
			await authStore.signOut();
		} catch (err) {
			console.error('[Auth Test] Sign out failed:', err);
		}
	}

	async function checkServiceWorkerSession() {
		if (!flowsDB) return;

		try {
			const session = await flowsDB.session.loadSession();
			console.log('[Auth Test] Session from Service Worker:', session);
			alert(
				session
					? `Session found: ${session.email}`
					: 'No session found in Service Worker'
			);
		} catch (err) {
			console.error('[Auth Test] Failed to get session:', err);
			alert('Error getting session from Service Worker');
		}
	}

	async function loadIndexedDBData() {
		if (!browser) return;

		// Prevent concurrent loads
		if (isLoadingDB) {
			console.log('[Auth Test] Already loading IndexedDB data, skipping...');
			return;
		}

		isLoadingDB = true;
		console.log('[Auth Test] Loading IndexedDB data...', { INDEXEDDB_NAME, INDEXEDDB_VERSION });
		indexedDBData.loading = true;
		indexedDBData.error = null;

		try {
			// Ensure constants are loaded
			if (!INDEXEDDB_NAME || !INDEXEDDB_VERSION) {
				throw new Error('IndexedDB constants not loaded yet. Please reload the page.');
			}

			console.log('[Auth Test] Opening database:', INDEXEDDB_NAME);
			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				// Add timeout to prevent hanging forever
				const timeout = setTimeout(() => {
					console.error('[Auth Test] Database open timeout after 10 seconds');
					reject(new Error('Database open timeout - Service Worker may still be initializing'));
				}, 10000);

				// Open without specifying version - opens whatever version exists
				const request = indexedDB.open(INDEXEDDB_NAME);
				request.onsuccess = () => {
					clearTimeout(timeout);
					console.log('[Auth Test] Database opened successfully');
					resolve(request.result);
				};
				request.onerror = () => {
					clearTimeout(timeout);
					console.error('[Auth Test] Database open error:', request.error);
					reject(request.error);
				};
				request.onblocked = () => {
					clearTimeout(timeout);
					console.warn('[Auth Test] Database open blocked');
					reject(new Error('Database open blocked - close other tabs'));
				};
				request.onupgradeneeded = (event) => {
					clearTimeout(timeout);
					console.warn('[Auth Test] Database upgrade triggered - this should not happen!');
					// Don't create tables here, let the SW do it
					reject(new Error('Database upgrade triggered from page - wait for Service Worker'));
				};
			});

			console.log('[Auth Test] Database object stores:', Array.from(db.objectStoreNames));

			// Check if object stores exist
			if (!db.objectStoreNames.contains('users') || !db.objectStoreNames.contains('auth_sessions')) {
				throw new Error('Database not initialized. Please sign in first to initialize the Service Worker.');
			}

			// Load users table
			console.log('[Auth Test] Loading users...');
			const usersTransaction = db.transaction(['users'], 'readonly');
			const usersStore = usersTransaction.objectStore('users');
			const usersRequest = usersStore.getAll();

			const users = await new Promise<any[]>((resolve, reject) => {
				usersRequest.onsuccess = () => {
					console.log('[Auth Test] Users loaded:', usersRequest.result.length);
					resolve(usersRequest.result);
				};
				usersRequest.onerror = () => reject(usersRequest.error);
			});

			// Load auth_sessions table
			console.log('[Auth Test] Loading sessions...');
			const sessionsTransaction = db.transaction(['auth_sessions'], 'readonly');
			const sessionsStore = sessionsTransaction.objectStore('auth_sessions');
			const sessionsRequest = sessionsStore.getAll();

			const sessions = await new Promise<any[]>((resolve, reject) => {
				sessionsRequest.onsuccess = () => {
					console.log('[Auth Test] Sessions loaded:', sessionsRequest.result.length);
					resolve(sessionsRequest.result);
				};
				sessionsRequest.onerror = () => reject(sessionsRequest.error);
			});

			indexedDBData.users = users.sort((a, b) =>
				new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime()
			);
			indexedDBData.sessions = sessions.sort((a, b) => b.expiresAt - a.expiresAt);

			console.log('[Auth Test] IndexedDB data loaded successfully:', {
				usersCount: users.length,
				sessionsCount: sessions.length
			});
		} catch (err) {
			console.error('[Auth Test] Failed to load IndexedDB data:', err);
			indexedDBData.error = err instanceof Error ? err.message : 'Failed to load data';
		} finally {
			indexedDBData.loading = false;
			isLoadingDB = false;
		}
	}
</script>

<div class="min-h-screen bg-gray-50 p-6">
	<div class="max-w-4xl mx-auto">
		<div class="mb-8">
			<h1 class="text-3xl font-bold mb-2">Auth Integration Test</h1>
			<p class="text-gray-600">
				Test flows-auth SignInForm with Service Worker session persistence
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Auth Form -->
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-xl font-semibold mb-4">Authentication</h2>

				{#if !browser}
					<p class="text-gray-500">Loading...</p>
				{:else if authState.isLoading}
					<div class="text-center py-8">
						<div
							class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
						></div>
						<p class="mt-2 text-gray-600">Loading auth...</p>
					</div>
				{:else if authState.error}
					<div class="bg-red-50 border border-red-200 rounded p-4">
						<p class="text-red-800 font-semibold">Error</p>
						<p class="text-red-600 text-sm mt-1">{authState.error}</p>
					</div>
				{:else if authState.isAuthenticated && authState.session}
					<div class="space-y-4">
						<div class="bg-green-50 border border-green-200 rounded p-4">
							<p class="text-green-800 font-semibold">✓ Authenticated</p>
							<p class="text-green-700 text-sm mt-1">
								{authState.session.user.email}
							</p>
						</div>

						<div class="space-y-2">
							<div class="text-sm">
								<span class="font-medium text-gray-700">User ID:</span>
								<span class="text-gray-600 ml-2">{authState.session.user.id}</span>
							</div>
							<div class="text-sm">
								<span class="font-medium text-gray-700">Auth Method:</span>
								<span class="text-gray-600 ml-2">{authState.session.authMethod}</span>
							</div>
							<div class="text-sm">
								<span class="font-medium text-gray-700">Expires At:</span>
								<span class="text-gray-600 ml-2">
									{new Date(authState.session.tokens.expiresAt).toLocaleString()}
								</span>
							</div>
						</div>

						<button
							onclick={handleSignOut}
							class="w-full bg-red-500 text-white py-2 px-4 rounded hover:bg-red-600 transition"
						>
							Sign Out
						</button>
					</div>
				{:else}
					<div>
						<p class="text-gray-600 text-sm mb-4">
							Sign in to test Service Worker session persistence
						</p>
						<SignInForm />
					</div>
				{/if}
			</div>

			<!-- Session Info & Actions -->
			<div class="bg-white rounded-lg shadow p-6">
				<h2 class="text-xl font-semibold mb-4">Service Worker Session</h2>

				<div class="space-y-4">
					<button
						onclick={checkServiceWorkerSession}
						disabled={!flowsDB}
						class="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
					>
						Check Service Worker Session
					</button>

					<div class="border-t pt-4">
						<h3 class="font-semibold text-gray-800 mb-2">Test Flow:</h3>
						<ol class="list-decimal list-inside space-y-2 text-sm text-gray-600">
							<li>Enter email and sign in</li>
							<li>Session should be saved to Service Worker automatically (via +layout.svelte)</li>
							<li>Click "Check Service Worker Session" to verify</li>
							<li>Open DevTools → Application → IndexedDB → flows-data → auth_sessions</li>
							<li>Verify session is persisted</li>
							<li>Sign out and verify session is cleared</li>
						</ol>
					</div>

					<div class="border-t pt-4">
						<h3 class="font-semibold text-gray-800 mb-2">Architecture:</h3>
						<ul class="list-disc list-inside space-y-1 text-sm text-gray-600">
							<li>Auth store initialized in +layout.svelte via <code class="bg-gray-100 px-1">setupAuthContext()</code></li>
							<li>This page uses <code class="bg-gray-100 px-1">getAuthStoreFromContext()</code> to access it</li>
							<li>Layout subscribes to auth changes and persists to Service Worker</li>
							<li>Session stored in IndexedDB (auth_sessions table)</li>
						</ul>
					</div>
				</div>
			</div>
		</div>

		<!-- IndexedDB Data -->
		<div class="mt-6 bg-white rounded-lg shadow p-6">
			<div class="flex justify-between items-center mb-4">
				<h2 class="text-xl font-semibold">IndexedDB Data</h2>
				<button
					onclick={loadIndexedDBData}
					class="bg-blue-500 text-white py-1 px-3 rounded text-sm hover:bg-blue-600 transition disabled:bg-gray-300"
					disabled={indexedDBData.loading}
				>
					{indexedDBData.loading ? 'Loading...' : '🔄 Refresh'}
				</button>
			</div>

			{#if indexedDBData.error}
				<div class="bg-red-50 border border-red-200 rounded p-4 mb-4">
					<p class="text-red-800 font-semibold">Error loading IndexedDB</p>
					<p class="text-red-600 text-sm mt-1">{indexedDBData.error}</p>
					<p class="text-red-600 text-xs mt-2">
						Make sure the Service Worker is running and IndexedDB tables exist.
					</p>
				</div>
			{/if}

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
				<!-- Users Table (Persistent) -->
				<div class="border rounded p-4">
					<h3 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
						<span>👤 Users Table</span>
						<span class="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
							Persistent
						</span>
					</h3>
					<p class="text-xs text-gray-600 mb-3">
						User profiles that survive sign out
					</p>

					{#if indexedDBData.users.length === 0}
						<p class="text-sm text-gray-500 italic">No users stored yet</p>
					{:else}
						<div class="space-y-2">
							{#each indexedDBData.users as user}
								<div class="bg-gray-50 border rounded p-3 text-sm">
									<div class="font-medium text-gray-900">{user.email}</div>
									<div class="text-xs text-gray-600 mt-1 space-y-0.5">
										<div>
											<span class="font-medium">ID:</span>
											<span class="font-mono">{user.userId.substring(0, 8)}...</span>
										</div>
										{#if user.name}
											<div>
												<span class="font-medium">Name:</span>
												{user.name}
											</div>
										{/if}
										<div>
											<span class="font-medium">Last used:</span>
											{new Date(user.lastUsed).toLocaleString()}
										</div>
										<div>
											<span class="font-medium">Last auth method:</span>
											<span class="bg-blue-100 text-blue-800 px-1 rounded"
												>{user.authMethod}</span
											>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Sessions Table (Temporary) -->
				<div class="border rounded p-4">
					<h3 class="font-semibold text-gray-800 mb-2 flex items-center gap-2">
						<span>🔑 Auth Sessions</span>
						<span class="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
							Temporary
						</span>
					</h3>
					<p class="text-xs text-gray-600 mb-3">Cleared on sign out</p>

					{#if indexedDBData.sessions.length === 0}
						<p class="text-sm text-gray-500 italic">No active sessions</p>
					{:else}
						<div class="space-y-2">
							{#each indexedDBData.sessions as session}
								{@const isExpired = session.expiresAt < Date.now()}
								<div
									class="bg-gray-50 border rounded p-3 text-sm {isExpired
										? 'opacity-50'
										: ''}"
								>
									<div class="font-medium text-gray-900">{session.email}</div>
									<div class="text-xs text-gray-600 mt-1 space-y-0.5">
										<div>
											<span class="font-medium">User ID:</span>
											<span class="font-mono">{session.userId.substring(0, 8)}...</span>
										</div>
										<div>
											<span class="font-medium">Expires:</span>
											{new Date(session.expiresAt).toLocaleString()}
											{#if isExpired}
												<span class="text-red-600 ml-1">(Expired)</span>
											{/if}
										</div>
										<div>
											<span class="font-medium">Auth method:</span>
											<span class="bg-blue-100 text-blue-800 px-1 rounded"
												>{session.authMethod}</span
											>
										</div>
										{#if session.savedAt}
											<div>
												<span class="font-medium">Saved:</span>
												{new Date(session.savedAt).toLocaleString()}
											</div>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<div class="mt-4 text-xs text-gray-500">
				<p>
					<strong>Users table:</strong> Persistent user profiles - survives sign out for
					quick re-authentication
				</p>
				<p class="mt-1">
					<strong>Auth sessions table:</strong> Active session tokens - cleared when you
					sign out
				</p>
			</div>
		</div>

		<!-- Console Logs -->
		<div class="mt-6 bg-white rounded-lg shadow p-6">
			<h2 class="text-xl font-semibold mb-4">Console Logs</h2>
			<p class="text-sm text-gray-600">
				Open browser DevTools Console to see detailed logs of:
			</p>
			<ul class="list-disc list-inside mt-2 text-sm text-gray-600 space-y-1">
				<li>🔐 Auth store initialized in layout</li>
				<li>[Layout] ✅ Session saved to Service Worker</li>
				<li>[Auth Test] Session from Service Worker: ...</li>
				<li>[Layout] Session cleared from Service Worker</li>
			</ul>
		</div>

		<!-- Navigation -->
		<div class="mt-6 flex gap-4">
			<a
				href="/journeys"
				class="inline-block bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition"
			>
				← Back to Journeys
			</a>
			<a
				href="/"
				class="inline-block bg-gray-200 text-gray-800 py-2 px-4 rounded hover:bg-gray-300 transition"
			>
				Home
			</a>
		</div>
	</div>
</div>
