<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		selected = false,
		tone = 'neutral',
		onclick = undefined,
		title = undefined,
		children
	}: {
		selected?: boolean;
		tone?: 'neutral' | 'warning' | 'danger' | 'accent';
		onclick?: () => void;
		title?: string;
		children: Snippet;
	} = $props();

	const TONES = {
		neutral: 'text-text-secondary',
		warning: 'text-warning',
		danger: 'text-danger',
		accent: 'text-accent'
	};
</script>

{#if onclick}
	<button
		{onclick}
		{title}
		class="press border-4 px-3 py-2 font-display text-[10px] leading-none {selected
			? 'border-accent bg-accent text-bg-primary'
			: `border-border bg-bg-secondary ${TONES[tone]} hover:bg-bg-hover hover:text-text-primary`}"
	>
		{@render children()}
	</button>
{:else}
	<span
		{title}
		class="border-2 border-border bg-bg-tertiary px-2 py-1 font-display text-[8px] leading-none {TONES[
			tone
		]}"
	>
		{@render children()}
	</span>
{/if}
