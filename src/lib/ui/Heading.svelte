<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		level = 2,
		children
	}: {
		level?: 1 | 2 | 3;
		children: Snippet;
	} = $props();

	const SIZES = { 1: 'text-base', 2: 'text-sm', 3: 'text-xs' };
</script>

<svelte:element
	this={`h${level}`}
	class="font-display {SIZES[level]} leading-relaxed text-text-primary"
>
	{@render children()}
</svelte:element>
