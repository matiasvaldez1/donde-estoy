<script lang="ts">
	import type { GameLocation, RoundConstraints } from '$lib/types';
	import { loadMaps, resolvePano } from '$lib/streetview/pano';
	import { stats } from '$lib/stores/stats.svelte';

	let {
		location,
		constraints
	}: {
		location: GameLocation;
		constraints: RoundConstraints;
	} = $props();

	let host: HTMLDivElement;
	let pano: google.maps.StreetViewPanorama | null = null;
	let status = $state<'loading' | 'ready' | 'error'>('loading');
	let message = $state('');

	/**
	 * Sin girar no hay forma honesta de bloquear el arrastre desde las opciones,
	 * asi que va una capa transparente por encima que se come los eventos. De
	 * paso tapa los enlaces de escape sin tocar la marca de Google, que sigue
	 * visible abajo.
	 */
	const locked = $derived(!constraints.allowPan);

	$effect(() => {
		const loc = location;
		const c = constraints;
		let cancelled = false;
		status = 'loading';

		(async () => {
			try {
				await loadMaps();
				const resolved = await resolvePano(loc);
				if (cancelled) return;

				const options: google.maps.StreetViewPanoramaOptions = {
					addressControl: false,
					showRoadLabels: false,
					clickToGo: c.allowMove,
					linksControl: c.allowMove,
					panControl: false,
					zoomControl: c.allowZoom,
					scrollwheel: c.allowZoom,
					disableDoubleClickZoom: !c.allowZoom,
					motionTracking: false,
					motionTrackingControl: false,
					fullscreenControl: false,
					imageDateControl: false,
					enableCloseButton: false
				};

				if (!pano) {
					pano = new google.maps.StreetViewPanorama(host, {
						...options,
						pano: resolved.panoId,
						pov: { heading: resolved.heading, pitch: 0 },
						zoom: 0
					});
				} else {
					pano.setOptions(options);
					pano.setPano(resolved.panoId);
					pano.setPov({ heading: resolved.heading, pitch: 0 });
					pano.setZoom(0);
				}

				stats.countPano();
				status = 'ready';
			} catch (err) {
				if (cancelled) return;
				status = 'error';
				message = err instanceof Error ? err.message : 'Error con el panorama';
			}
		})();

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="relative h-full w-full bg-bg-tertiary">
	<div bind:this={host} class="h-full w-full"></div>

	{#if locked && status === 'ready'}
		<div class="absolute inset-0 z-10 cursor-not-allowed" aria-hidden="true"></div>
	{/if}

	{#if status === 'loading'}
		<div class="absolute inset-0 z-10 flex items-center justify-center bg-bg-primary/80 text-sm text-text-muted">
			Buscando el panorama…
		</div>
	{:else if status === 'error'}
		<div class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-bg-primary/90 p-6 text-center">
			<p class="text-sm text-danger">{message}</p>
			{#if import.meta.env.DEV}
				<p class="text-xs text-text-muted">
					Copiá <code>.env.example</code> a <code>.env</code> y poné tu <code>VITE_MAPS_KEY</code>.
				</p>
			{/if}
		</div>
	{/if}
</div>
