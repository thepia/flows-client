<script lang="ts">
let {
  ref = $bindable(null),
  class: className,
  for: htmlFor,
  children,
  ...restProps
}: {
  ref?: HTMLLabelElement | null;
  class?: string;
  for?: string;
  children?: any;
  [key: string]: any;
} = $props();
</script>

<label
	bind:this={ref}
	for={htmlFor}
	class={cn(
		"text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
		className
	)}
	{...restProps}
>
	{@render children?.()}
</label>
