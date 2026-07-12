<script lang="ts">
import { onMount } from 'svelte';

export let employee;
export let compact = false;
export let enrollment = null;
export let onSelect = null;

onMount(() => {
  console.log(
    'EmployeeCard mounted for',
    employee.id,
    'onSelect:',
    typeof onSelect,
    'onSelect value:',
    onSelect
  );
});

function _getCompletionColor(percentage) {
  if (percentage >= 80) return 'text-green-600';
  if (percentage >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

function handleClick() {
  console.log('EmployeeCard clicked:', employee.id);
  onSelect?.(employee);
}

function _handleKeydown(e) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
}
</script>

{#if onSelect}
<button 
	class="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer w-full text-left {compact ? 'p-3' : 'p-4'}"
	data-testid="person-card-{employee.id}"
	on:click={handleClick}
	on:keydown={handleKeydown}
>
	<div class="flex items-center space-x-4">
		<div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
			<span class="text-sm font-medium text-primary">
				{employee.firstName[0]}{employee.lastName[0]}
			</span>
		</div>
		<div>
			<h3 class="font-medium text-gray-900">
				{employee.firstName} {employee.lastName}
			</h3>
			<p class="text-sm text-gray-500">{employee.position}</p>
			{#if !compact}
				<p class="text-xs text-gray-400">{employee.department} • {employee.location}</p>
			{/if}
		</div>
	</div>
	
	<div class="flex items-center space-x-4">
		{#if enrollment && !compact}
			<div class="text-right">
				<div class="text-sm font-medium {getCompletionColor(enrollment.completionPercentage)}">
					{enrollment.completionPercentage}% Complete
				</div>
				<div class="text-xs text-gray-500">
					{enrollment.documentsStatus.length} docs, {enrollment.tasksStatus.length} tasks
				</div>
			</div>
		{/if}
		
		<EmployeeStatusBadge status={employee.status} size={compact ? 'sm' : 'md'} />
		
		{#if !compact}
			<span class="text-sm text-blue-600 hover:text-blue-800">
				View Details →
			</span>
		{/if}
	</div>
</button>
{:else}
<div 
	class="flex items-center justify-between p-4 border rounded-lg {compact ? 'p-3' : 'p-4'}"
	data-testid="person-card-{employee.id}"
>
	<div class="flex items-center space-x-4">
		<div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
			<span class="text-sm font-medium text-primary">
				{employee.firstName[0]}{employee.lastName[0]}
			</span>
		</div>
		<div>
			<h3 class="font-medium text-gray-900">
				{employee.firstName} {employee.lastName}
			</h3>
			<p class="text-sm text-gray-500">{employee.position}</p>
			{#if !compact}
				<p class="text-xs text-gray-400">{employee.department} • {employee.location}</p>
			{/if}
		</div>
	</div>
	
	<div class="flex items-center space-x-4">
		{#if enrollment && !compact}
			<div class="text-right">
				<div class="text-sm font-medium {getCompletionColor(enrollment.completionPercentage)}">
					{enrollment.completionPercentage}% Complete
				</div>
				<div class="text-xs text-gray-500">
					{enrollment.documentsStatus.length} docs, {enrollment.tasksStatus.length} tasks
				</div>
			</div>
		{/if}
		
		<EmployeeStatusBadge status={employee.status} size={compact ? 'sm' : 'md'} />
		
		{#if !compact}
			<Button variant="outline" size="sm" href="/people/{employee.id}">
				View Details
			</Button>
		{/if}
	</div>
</div>
{/if}