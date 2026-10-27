<script lang="ts">
	import type { GameLocation } from '$lib/types';
	import { embedUrl } from '$lib/streetview/pano';
	import { stats } from '$lib/stores/stats.svelte';

	let { location }: { location: GameLocation } = $props();

	/**
	 * Driver alternativo: el Embed API es gratis e ilimitado, pero es un iframe.
	 * No se puede leer ni fijar la camara, asi que los escalones que bloquean
	 * girar o moverse no se pueden hacer cumplir aca.
	 */
	const src = $derived(embedUrl(location, location.heading ?? 0));

	$effect(() => {
		void src;
		stats.countPano();
	});
</script>

<iframe
	title="Panorama"
	class="h-full w-full border-0"
	{src}
	referrerpolicy="no-referrer-when-downgrade"
	allowfullscreen
></iframe>
