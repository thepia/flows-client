<script lang="ts">
	import type { FlowsJourney, FlowsTask } from '@thepia/flows-db/types';

	interface Props {
		journey: FlowsJourney;
		tasks: FlowsTask[];
	}

	let { journey, tasks }: Props = $props();

	function getStatusColor(status: FlowsJourney['status']): string {
		const colors: Record<FlowsJourney['status'], string> = {
			invited: 'bg-gray-100 text-gray-800',
			active: 'bg-blue-100 text-blue-800',
			completed: 'bg-green-100 text-green-800',
			cancelled: 'bg-red-100 text-red-800',
			archived: 'bg-gray-100 text-gray-600'
		};
		return colors[status];
	}

	function getTaskStatusColor(status: FlowsTask['status']): string {
		const colors: Record<FlowsTask['status'], string> = {
			pending: 'bg-gray-100 text-gray-800',
			in_progress: 'bg-blue-100 text-blue-800',
			completed: 'bg-green-100 text-green-800',
			cancelled: 'bg-red-100 text-red-800',
			blocked: 'bg-yellow-100 text-yellow-800'
		};
		return colors[status];
	}
</script>

<div>
	<!-- Journey Header -->
	<div class="bg-white rounded-lg shadow p-6 mb-6">
		<div class="flex items-start justify-between mb-4">
			<div>
				<h2 class="text-2xl font-bold mb-2">{journey.title}</h2>
				{#if journey.description}
					<p class="text-gray-600">{journey.description}</p>
				{/if}
			</div>
			<span class="text-sm px-3 py-1 rounded-full {getStatusColor(journey.status)}">
				{journey.status}
			</span>
		</div>

		<!-- Metadata -->
		<div class="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
			{#each Object.entries(journey.metadata) as [key, value]}
				<div>
					<p class="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
					<p class="font-medium">{value}</p>
				</div>
			{/each}
		</div>

		<!-- Timeline -->
		<div>
			<h3 class="font-semibold mb-3">Timeline</h3>
			<div class="space-y-2 text-sm">
				<div class="flex justify-between">
					<span class="text-gray-600">Invited:</span>
					<span>{new Date(journey.invited_at).toLocaleDateString()}</span>
				</div>
				{#if journey.started_at}
					<div class="flex justify-between">
						<span class="text-gray-600">Started:</span>
						<span>{new Date(journey.started_at).toLocaleDateString()}</span>
					</div>
				{/if}
				{#if journey.due_date}
					<div class="flex justify-between">
						<span class="text-gray-600">Due:</span>
						<span>{new Date(journey.due_date).toLocaleDateString()}</span>
					</div>
				{/if}
				{#if journey.ended_at}
					<div class="flex justify-between">
						<span class="text-gray-600">Ended:</span>
						<span>{new Date(journey.ended_at).toLocaleDateString()}</span>
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Tasks -->
	{#if tasks.length > 0}
		<div class="bg-white rounded-lg shadow p-6">
			<h3 class="text-xl font-semibold mb-4">Tasks ({tasks.length})</h3>

			<div class="space-y-3">
				{#each tasks as task}
					<div class="border rounded-lg p-4">
						<div class="flex items-start justify-between mb-2">
							<div class="flex-1">
								<h4 class="font-semibold">{task.title}</h4>
								{#if task.description}
									<p class="text-sm text-gray-600 mt-1">{task.description}</p>
								{/if}
							</div>
							<span class="text-xs px-2 py-1 rounded-full {getTaskStatusColor(task.status)}">
								{task.status.replace('_', ' ')}
							</span>
						</div>

						<div class="grid grid-cols-2 gap-2 mt-3 text-sm">
							{#if task.priority}
								<div>
									<span class="text-gray-500">Priority:</span>
									<span class="font-medium capitalize ml-1">{task.priority}</span>
								</div>
							{/if}
							{#if task.estimated_duration}
								<div>
									<span class="text-gray-500">Duration:</span>
									<span class="font-medium ml-1">{task.estimated_duration} min</span>
								</div>
							{/if}
							{#if task.due_date}
								<div>
									<span class="text-gray-500">Due:</span>
									<span class="font-medium ml-1">{new Date(task.due_date).toLocaleDateString()}</span
									>
								</div>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
