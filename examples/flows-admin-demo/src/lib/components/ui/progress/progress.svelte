<script lang="ts">
let {
  ref = $bindable(null),
  class: className,
  max = 100,
  value,
  ...restProps
}: {
  ref?: HTMLDivElement | null;
  class?: string;
  max?: number;
  value?: number;
  [key: string]: any;
} = $props();
</script>

<div
	bind:this={ref}
	class={cn("bg-secondary relative h-4 w-full overflow-hidden rounded-full", className)}
	role="progressbar"
	aria-valuemin="0"
	aria-valuemax={max}
	aria-valuenow={value}
	{...restProps}
>
	<div
		class="bg-primary h-full w-full flex-1 transition-all"
		style={`transform: translateX(-${100 - (100 * (value ?? 0)) / (max ?? 1)}%)`}
	></div>
</div>
