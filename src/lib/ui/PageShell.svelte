<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		width = 'max-w-4xl',
		children
	}: {
		width?: string;
		children: Snippet;
	} = $props();
</script>

<div class="mx-auto {width} space-y-8">
	{@render children()}
</div>
