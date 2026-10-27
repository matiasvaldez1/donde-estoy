<script lang="ts">
	import { MODE_LIST } from '$lib/game/modes';
	import { dailyNumber } from '$lib/game/modes/diario';
	import { escalationChain, isPlayable, loadRegions } from '$lib/data/regions';
	import { hasKey, panoDriver } from '$lib/streetview/pano';
	import { settings } from '$lib/stores/settings.svelte';
	import { stats } from '$lib/stores/stats.svelte';
	import { localDateString } from '$lib/utils';
	import RegionPicker from '$lib/components/RegionPicker.svelte';
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
				// Si la region guardada quedo sin pool, caer a la primera jugable.
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

<div class="mx-auto max-w-4xl space-y-8">
	{#if !hasKey()}
		<div class="rounded border border-warning/40 bg-warning/10 p-4 text-sm">
			<p class="font-medium text-warning">Falta la clave de Google Maps.</p>
			<p class="mt-1 text-text-secondary">
				Copiá <code>.env.example</code> a <code>.env</code> y poné tu <code>VITE_MAPS_KEY</code>.
				Habilitá <em>Maps JavaScript API</em>, restringí la clave por referrer y ponele un tope
				diario de cuota en Cloud console. Sin eso el mapa funciona pero el panorama no.
			</p>
		</div>
	{/if}

	<section>
		<h1 class="text-2xl font-semibold text-text-primary">Modos</h1>
		<p class="mt-1 text-sm text-text-muted">
			Driver de panorama: <code>{panoDriver()}</code>
		</p>
		<div class="mt-4 grid gap-3 sm:grid-cols-2">
			{#each MODE_LIST as mode (mode.id)}
				{@const hecho = mode.id === 'diario' && stats.dailyDone(today)}
				<a
					href={`/jugar/${mode.id}`}
					class="rounded border border-border bg-bg-secondary p-4 transition-colors hover:border-accent hover:bg-bg-hover"
				>
					<div class="flex items-center gap-2">
						<span class="text-accent">{mode.icon}</span>
						<h2 class="font-medium text-text-primary">{mode.name}</h2>
						{#if mode.id === 'diario'}
							<span class="ml-auto text-xs text-text-muted">#{dailyNumber(today)}</span>
						{/if}
					</div>
					<p class="mt-1.5 text-sm text-text-secondary">{mode.tagline}</p>
					{#if hecho}
						<p class="mt-2 text-xs text-accent">Ya lo jugaste hoy — mirá el resultado</p>
					{/if}
				</a>
			{/each}
		</div>
	</section>

	<section>
		<h2 class="text-lg font-semibold text-text-primary">Región de arranque</h2>
		<p class="mt-1 mb-4 text-sm text-text-muted">
			Clásica juega siempre acá. La Escalera arranca acá y se va ensanchando.
		</p>

		{#if loading}
			<p class="text-sm text-text-muted">Cargando regiones…</p>
		{:else if loadError}
			<p class="text-sm text-danger">{loadError}</p>
		{:else}
			<RegionPicker
				{regions}
				selected={settings.current.playerRegionId}
				onselect={(id) => settings.setRegion(id)}
			/>

			{#if chain.length > 1}
				<p class="mt-4 text-sm text-text-muted">
					La escalera va a subir por:
					<span class="text-text-secondary">{chain.map((r) => r.name).join(' → ')}</span>
				</p>
			{:else if chain.length === 1}
				<p class="mt-4 text-sm text-warning">
					{chain[0].name} es lo más ancho que tenés horneado, así que la escalera va a apretar
					tiempo y cámara sin cambiar de región.
				</p>
			{/if}
		{/if}
	</section>
</div>
