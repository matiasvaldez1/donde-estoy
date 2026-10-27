<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import Icon from '$lib/ui/Icon.svelte';
	import type { IconName } from '$lib/ui/icons';

	let { children } = $props();

	const navItems: Array<{ href: string; label: string; icon: IconName }> = [
		{ href: '/', label: 'Jugar', icon: 'jugar' },
		{ href: '/stats', label: 'Stats', icon: 'stats' },
		{ href: '/config', label: 'Config', icon: 'config' }
	];

	/** La pantalla de juego se come todo el alto: ahí la barra molesta. */
	const playing = $derived($page.url.pathname.startsWith('/jugar/'));
</script>

{#if playing}
	{@render children()}
{:else}
	<div class="flex min-h-dvh flex-col">
		<nav
			class="flex flex-wrap items-center gap-2 border-b-4 border-border bg-bg-secondary px-5 py-4"
		>
			<a href="/" class="mr-6 font-display text-xs text-accent">¿Dónde Estoy?</a>
			{#each navItems as item}
				<a
					href={item.href}
					class="press flex items-center gap-2 border-4 px-3 py-2 font-display text-[10px] leading-none {$page
						.url.pathname === item.href
						? 'border-accent bg-accent text-bg-primary'
						: 'border-transparent text-text-secondary hover:border-border hover:text-text-primary'}"
				>
					<Icon name={item.icon} size={12} />
					{item.label}
				</a>
			{/each}
		</nav>
		<main class="flex-1 p-6 sm:p-8">
			{@render children()}
		</main>
	</div>
{/if}
