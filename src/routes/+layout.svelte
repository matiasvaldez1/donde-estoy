<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Jugar', icon: '◉' },
		{ href: '/stats', label: 'Estadísticas', icon: '▤' },
		{ href: '/config', label: 'Configuración', icon: '⚙' }
	];

	/** La pantalla de juego se come todo el alto: ahí la barra molesta. */
	const playing = $derived($page.url.pathname.startsWith('/jugar/'));
</script>

{#if playing}
	{@render children()}
{:else}
	<div class="flex min-h-screen flex-col">
		<nav class="flex items-center gap-1 border-b border-border bg-bg-secondary px-5 py-3">
			<a href="/" class="mr-6 text-lg font-semibold text-text-primary">¿Dónde Estoy?</a>
			{#each navItems as item}
				<a
					href={item.href}
					class="flex items-center gap-2 rounded px-3 py-1.5 text-sm transition-colors {$page.url
						.pathname === item.href
						? 'bg-accent-muted text-accent'
						: 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}"
				>
					<span>{item.icon}</span>
					{item.label}
				</a>
			{/each}
		</nav>
		<main class="flex-1 p-8">
			{@render children()}
		</main>
	</div>
{/if}
