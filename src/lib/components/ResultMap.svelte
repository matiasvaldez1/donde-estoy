<script lang="ts">
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import type { RoundResult } from '$lib/types';
	import { mapColors } from '$lib/ui/theme';

	let { result }: { result: RoundResult } = $props();

	let host: HTMLDivElement;

	$effect(() => {
		const c = mapColors();
		const map = L.map(host, { attributionControl: true });
		L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
			attribution: '&copy; OpenStreetMap, &copy; CARTO',
			maxZoom: 18
		}).addTo(map);

		const truth: L.LatLngTuple = [result.location.lat, result.location.lng];
		L.circleMarker(truth, {
			radius: 8,
			color: c.ink,
			weight: 3,
			fillColor: c.truth,
			fillOpacity: 1
		})
			.addTo(map)
			.bindTooltip('Acá era', { permanent: false });

		const guess = result.guess;
		if (guess?.lat !== undefined && guess.lng !== undefined) {
			const pin: L.LatLngTuple = [guess.lat, guess.lng];
			L.circleMarker(pin, {
				radius: 7,
				color: c.ink,
				weight: 3,
				fillColor: c.guess,
				fillOpacity: 1
			})
				.addTo(map)
				.bindTooltip('Tu respuesta', { permanent: false });
			L.polyline([pin, truth], { color: c.line, weight: 3, dashArray: '8 8' }).addTo(map);
			map.fitBounds(L.latLngBounds([pin, truth]).pad(0.35));
		} else {
			map.setView(truth, 6);
		}

		const observer = new ResizeObserver(() => map.invalidateSize({ animate: false }));
		observer.observe(host);

		return () => {
			observer.disconnect();
			map.remove();
		};
	});
</script>

<div bind:this={host} class="h-full w-full"></div>
