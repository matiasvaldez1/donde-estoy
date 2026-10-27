<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		variant = 'secondary',
		href = undefined,
		disabled = false,
		type = 'button',
		full = false,
		onclick = undefined,
		class: klass = '',
		children
	}: {
		variant?: 'primary' | 'secondary' | 'danger' | 'warning';
		href?: string;
		disabled?: boolean;
		type?: 'button' | 'submit';
		full?: boolean;
		onclick?: (event: MouseEvent) => void;
		class?: string;
		children: Snippet;
	} = $props();

	const NES: Record<string, string> = {
		primary: 'nes-btn is-success',
		secondary: 'nes-btn',
		danger: 'nes-btn is-error',
		warning: 'nes-btn is-warning'
	};

	const cls = $derived(
		`${disabled ? 'nes-btn is-disabled' : NES[variant]} press font-display text-[10px] leading-none ${
			full ? 'w-full' : ''
		} ${klass}`
	);
</script>

{#if href}
	<a {href} class={cls} role="button">{@render children()}</a>
{:else}
	<button {type} {disabled} {onclick} class={cls}>
		{@render children()}
	</button>
{/if}
