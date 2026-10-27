<script lang="ts">
	import { MODE_LIST } from '$lib/game/modes';
	import { dailyNumber } from '$lib/game/modes/diario';
	import { escalationChain, isPlayable, loadRegions } from '$lib/data/regions';
	import { hasKey } from '$lib/streetview/pano';
	import { settings } from '$lib/stores/settings.svelte';
	import { stats } from '$lib/stores/stats.svelte';
	import { localDateString } from '$lib/utils';
	import RegionPicker from '$lib/components/RegionPicker.svelte';
	import Globe from '$lib/components/Globe.svelte';
	import Card from '$lib/ui/Card.svelte';
	import Heading from '$lib/ui/Heading.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import PageShell from '$lib/ui/PageShell.svelte';
	import type { Region } from '$lib/types';

	let regions = $state<Record<string, Region>>({});
	let loading = $state(true);
	let loadError = $state<string | null>(null);

	const today = localDateString();

	$effect(() => {
		settings.load();
		stats.load();
		loadRegions()
			.then((data) => {
				regions = data.regions;
				// Si la región guardada quedó sin pool, caer a la primera jugable.
				if (!isPlayable(regions[settings.current.playerRegionId])) {
					const fallback = Object.values(regions).find(isPlayable);
					if (fallback) settings.setRegion(fallback.id);
				}
			})
			.catch((err) => (loadError = err instanceof Error ? err.message : 'Error cargando regiones'))
			.finally(() => (loading = false));
	});

	const chain = $derived(
		escalationChain(settings.current.playerRegionId, regions).filter((r) => isPlayable(r))
	);
</script>

<!-- Globo decorativo: gira solo, no recibe clicks, se carga aparte del juego. -->
<div class="pointer-events-none fixed inset-0 -z-10 opacity-25" aria-hidden="true">
	<Globe ambient />
</div>

<PageShell>
	{#if !hasKey()}
		<div class="nes-container is-dark is-rounded space-y-2">
			<p class="font-display text-[10px] text-warning">Falta la clave de Google Maps</p>
			<p class="text-text-secondary">
				El mapa funciona, pero no vas a ver ningún panorama.
				{#if import.meta.env.DEV}
					Copiá <code>.env.example</code> a <code>.env</code> y poné tu <code>VITE_MAPS_KEY</code>.
				{/if}
			</p>
		</div>
	{/if}

	<section>
		<Heading level={1}>Modos</Heading>
		<div class="mt-5 grid gap-4 sm:grid-cols-2">
			{#each MODE_LIST as mode (mode.id)}
				{@const hecho = mode.id === 'diario' && stats.dailyDone(today)}
				<Card href={`/jugar/${mode.id}`}>
					<div class="flex items-center gap-3">
						<Icon name={mode.icon} size={24} class="text-accent" />
						<h2 class="font-display text-[10px] leading-relaxed text-text-primary">
							{mode.name}
						</h2>
						{#if mode.id === 'diario'}
							<span class="ml-auto font-display text-[8px] text-text-muted">
								#{dailyNumber(today)}
							</span>
						{/if}
					</div>
					<p class="mt-3 text-text-secondary">{mode.tagline}</p>
					{#if hecho}
						<p class="mt-2 font-display text-[8px] text-accent">Ya lo jugaste hoy</p>
					{/if}
				</Card>
			{/each}
		</div>
	</section>

	<section>
		<Heading>Región de arranque</Heading>
		<p class="mt-2 mb-5 text-text-muted">
			Clásica juega siempre acá. La Escalera arranca acá y se va ensanchando.
		</p>

		{#if loading}
			<p class="text-text-muted">Cargando regiones…</p>
		{:else if loadError}
			<p class="text-danger">{loadError}</p>
		{:else}
			<RegionPicker
				{regions}
				selected={settings.current.playerRegionId}
				onselect={(id) => settings.setRegion(id)}
			/>

			{#if chain.length > 1}
				<p class="mt-5 text-text-muted">
					La escalera va a subir por
					<span class="text-text-secondary">{chain.map((r) => r.name).join(' → ')}</span>
				</p>
			{:else if chain.length === 1}
				<p class="mt-5 text-warning">
					{chain[0].name} es lo más ancho que tenés horneado, así que la escalera va a apretar tiempo
					y cámara sin cambiar de región.
				</p>
			{/if}
		{/if}
	</section>
</PageShell>
