<script lang="ts">
import type { ComponentType } from 'svelte';

// Props
export let title: string;
export let value: number | string;
export const description: string = '';
export const icon: ComponentType = null;
export const color: 'primary' | 'success' | 'warning' | 'danger' | 'info' = 'primary';
export const loading: boolean = false;
export const trend: {
  value: number;
  direction: 'up' | 'down';
  period: string;
} = null;

// Color mappings for different metric types
$: iconColorClass = {
  primary: 'text-primary',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  info: 'text-blue-600',
}[color];

$: valueColorClass = {
  primary: 'text-primary',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  info: 'text-blue-600',
}[color];

$: trendColorClass = trend?.direction === 'up' ? 'text-green-600' : 'text-red-600';
</script>

<Card>
	<CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
		<CardTitle class="text-sm font-medium">{title}</CardTitle>
		{#if icon}
			<svelte:component this={icon} class="h-4 w-4 {iconColorClass}" />
		{/if}
	</CardHeader>
	<CardContent>
		<div class="text-2xl font-bold {valueColorClass}">
			{#if loading}
				<div class="flex items-center space-x-2">
					<div class="w-4 h-4 bg-current rounded-full animate-pulse"></div>
					<div class="w-6 h-4 bg-current rounded animate-pulse"></div>
				</div>
			{:else}
				{typeof value === 'number' ? value.toLocaleString() : value}
			{/if}
		</div>
		
		{#if description}
			<p class="text-xs text-muted-foreground">{description}</p>
		{/if}
		
		{#if trend}
			<div class="flex items-center space-x-1 text-xs {trendColorClass} mt-1">
				<span>{trend.direction === 'up' ? '↑' : '↓'}</span>
				<span>{Math.abs(trend.value)}%</span>
				<span class="text-muted-foreground">vs {trend.period}</span>
			</div>
		{/if}
	</CardContent>
</Card>