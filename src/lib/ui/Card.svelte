<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		href = undefined,
		pad = 'p-4',
		class: klass = '',
		children
	}: {
		href?: string;
		pad?: string;
		class?: string;
		children: Snippet;
	} = $props();

	const cls = $derived(`nes-container is-dark ${pad} ${klass}`);
</script>

{#if href}
	<a {href} class="{cls} block transition-transform duration-75 hover:-translate-y-1">
		{@render children()}
	</a>
{:else}
	<div class={cls}>{@render children()}</div>
{/if}
