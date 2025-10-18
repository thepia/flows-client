<script lang="ts">
	import type { FlowsJourney, FlowsTask, FlowsDBClient } from '@thepia/flows-db/types';
	import { onMount } from 'svelte';
	import JourneysList from '$lib/components/JourneysList.svelte';
	import JourneyDetails from '$lib/components/JourneyDetails.svelte';

	let journeys: FlowsJourney[] = [];
	let selectedJourney: FlowsJourney | null = null;
	let tasks: FlowsTask[] = [];
	let loading = true;
	let error: string | null = null;

	let db: FlowsDBClient | null = null;

	onMount(async () => {
		try {
			// Dynamically import client in browser only
			const { FlowsDBClient } = await import('@thepia/flows-db/client');
			db = new FlowsDBClient();

			// Query all journeys from IndexedDB via Service Worker
			journeys = await db.query.journeys({
				orderBy: [{ column: 'created_at', ascending: false }]
			});
			loading = false;
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load journeys';
			loading = false;
		}
	});

	async function selectJourney(journey: FlowsJourney) {
		if (!db) return;

		selectedJourney = journey;
		try {
			tasks = await db.query.tasksByJourney({
				journeyId: journey.id,
				orderBy: [{ column: 'order', ascending: true }]
			});
		} catch (err) {
			console.error('Failed to load tasks:', err);
		}
	}
</script>

<div class="container mx-auto p-6">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Journeys</h1>
		<p class="text-gray-600">
			Data loaded from IndexedDB via Service Worker using
			<code class="bg-gray-100 px-2 py-1 rounded text-sm">@thepia/flows-db</code> types
		</p>
	</div>

	{#if loading}
		<div class="text-center py-12">
			<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
			<p class="mt-4 text-gray-600">Loading journeys from IndexedDB...</p>
		</div>
	{:else if error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
			<p class="text-red-800 font-semibold">Error loading journeys</p>
			<p class="text-red-600 text-sm mt-2">{error}</p>
		</div>
	{:else if journeys.length === 0}
		<div class="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
			<p class="text-gray-600">No journeys found. Service Worker should seed on first load.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Journeys List -->
			<div class="lg:col-span-1">
				<JourneysList {journeys} {selectedJourney} onSelectJourney={selectJourney} />
			</div>

			<!-- Journey Details -->
			<div class="lg:col-span-2">
				{#if selectedJourney}
					<JourneyDetails journey={selectedJourney} {tasks} />
				{:else}
					<div class="bg-white rounded-lg shadow p-12 text-center">
						<p class="text-gray-500">← Select a journey to view details</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Technical Info -->
	<div class="mt-8 bg-gray-50 rounded-lg p-6">
		<h2 class="text-xl font-semibold mb-4">Architecture</h2>

		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
			<div class="bg-white p-4 rounded border">
				<h3 class="font-semibold mb-2">1. Svelte Page</h3>
				<p class="text-gray-600 text-xs">
					Uses <code class="bg-gray-100 px-1">getFlowsDB()</code> client to query data
				</p>
			</div>

			<div class="bg-white p-4 rounded border">
				<h3 class="font-semibold mb-2">2. Service Worker</h3>
				<p class="text-gray-600 text-xs">
					Manages IndexedDB, handles RPC calls via MessageChannel
				</p>
			</div>

			<div class="bg-white p-4 rounded border">
				<h3 class="font-semibold mb-2">3. IndexedDB</h3>
				<p class="text-gray-600 text-xs">
					Stores journeys, tasks, evidence. Seeded with demo data on first load.
				</p>
			</div>
		</div>

		<div class="mt-4 p-4 bg-white rounded border">
			<p class="text-xs text-gray-600 mb-2">Import from workspace:</p>
			<code class="text-xs text-blue-600">
				import type {'{'} FlowsJourney, FlowsTask {'}'} from '@thepia/flows-db/types';
			</code>
		</div>
	</div>
</div>
