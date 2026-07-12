<script lang="ts">
import type { FlowsJourney } from '@thepia/flows-client/types';

interface Props {
  journeys: FlowsJourney[];
  selectedJourney: FlowsJourney | null;
  onSelectJourney: (journey: FlowsJourney) => void;
}

let { journeys, selectedJourney, onSelectJourney }: Props = $props();

type ViewMode = 'ongoing' | 'completed';
let viewMode = $state<ViewMode>('ongoing');

// Filter journeys based on view mode
const filteredJourneys = $derived(
  viewMode === 'ongoing'
    ? journeys.filter((j) => j.status !== 'completed')
    : journeys.filter((j) => j.status === 'completed')
);

// Group journeys by client_id
function groupJourneysByClient(journeys: FlowsJourney[]) {
  const groups = new Map<string, FlowsJourney[]>();

  for (const journey of journeys) {
    const clientId = journey.client_id;
    if (!groups.has(clientId)) {
      groups.set(clientId, []);
    }
    groups.get(clientId)?.push(journey);
  }

  return groups;
}

const _groupedJourneys = $derived(groupJourneysByClient(filteredJourneys));

// Count journeys for each view
const _ongoingCount = $derived(journeys.filter((j) => j.status !== 'completed').length);
const _completedCount = $derived(journeys.filter((j) => j.status === 'completed').length);

function _getStatusColor(status: FlowsJourney['status']): string {
  const colors: Record<FlowsJourney['status'], string> = {
    invited: 'bg-gray-100 text-gray-800',
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    archived: 'bg-gray-100 text-gray-600',
  };
  return colors[status];
}

// Get client name from metadata
function _getClientName(clientId: string, journeys: FlowsJourney[]): string {
  const journey = journeys.find((j) => j.client_id === clientId);
  return (journey?.metadata?.client_name as string) || `Client ${clientId}`;
}
</script>

<div class="bg-white rounded-lg shadow p-6">
	<div class="flex items-center justify-between mb-4">
		<h2 class="text-xl font-semibold">
			{viewMode === 'ongoing' ? 'Ongoing Journeys' : 'Completed Journeys'}
			({filteredJourneys.length})
		</h2>
	</div>

	<div class="space-y-6">
		{#each [...groupedJourneys.entries()] as [clientId, clientJourneys]}
			<!-- Client Group Header -->
			<div>
				<h3 class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3 px-2">
					{getClientName(clientId, clientJourneys)}
				</h3>

				<!-- Journeys in this group -->
				<div class="space-y-3">
					{#each clientJourneys as journey}
						<button
							class="w-full text-left p-4 rounded-lg border-2 transition-all hover:border-blue-400
								{selectedJourney?.id === journey.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}"
							onclick={() => onSelectJourney(journey)}
						>
							<div class="flex items-start justify-between mb-2">
								<h4 class="font-semibold text-sm">{journey.title}</h4>
								<span class="text-xs px-2 py-1 rounded-full {getStatusColor(journey.status)}">
									{journey.status}
								</span>
							</div>

							{#if journey.description}
								<p class="text-xs text-gray-600 mb-2">{journey.description}</p>
							{/if}

							{#if journey.progress_percentage !== undefined}
								<div class="w-full bg-gray-200 rounded-full h-2 mb-1">
									<div
										class="bg-blue-500 h-2 rounded-full transition-all"
										style="width: {journey.progress_percentage}%"
									></div>
								</div>
								<p class="text-xs text-gray-500">{journey.progress_percentage}% complete</p>
							{/if}

							<div class="mt-2 text-xs text-gray-500">
								<span>👥 {journey.participants.length} participants</span>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<!-- View Toggle Link -->
	<div class="mt-6 pt-4 border-t flex justify-end">
		{#if viewMode === 'ongoing'}
			<button
				onclick={() => viewMode = 'completed'}
				class="text-sm text-gray-600 hover:text-blue-600 transition-colors"
			>
				completed... ({completedCount})
			</button>
		{:else}
			<button
				onclick={() => viewMode = 'ongoing'}
				class="text-sm text-gray-600 hover:text-blue-600 transition-colors"
			>
				ongoing... ({ongoingCount})
			</button>
		{/if}
	</div>
</div>
