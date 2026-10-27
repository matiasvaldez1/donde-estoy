<script lang="ts">
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import type { RoundResult } from '$lib/types';

	let { result }: { result: RoundResult } = $props();

	let host: HTMLDivElement;

	$effect(() => {
		const map = L.map(host, { attributionControl: true });
		L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
			attribution: '&copy; OpenStreetMap',
			maxZoom: 18
		}).addTo(map);

		const truth: L.LatLngTuple = [result.location.lat, result.location.lng];
		L.circleMarker(truth, {
			radius: 8,
			color: '#0f0f0f',
			weight: 2,
			fillColor: '#10b981',
			fillOpacity: 1
		})
			.addTo(map)
			.bindTooltip('Acá era', { permanent: false });

		const guess = result.guess;
		if (guess?.lat !== undefined && guess.lng !== undefined) {
			const pin: L.LatLngTuple = [guess.lat, guess.lng];
			L.circleMarker(pin, {
				radius: 7,
				color: '#0f0f0f',
				weight: 2,
				fillColor: '#e5e5e5',
				fillOpacity: 1
			})
				.addTo(map)
				.bindTooltip('Tu respuesta', { permanent: false });
			L.polyline([pin, truth], { color: '#f59e0b', weight: 2, dashArray: '6 6' }).addTo(map);
			map.fitBounds(L.latLngBounds([pin, truth]).pad(0.35));
		} else {
			map.setView(truth, 6);
		}

		return () => map.remove();
	});
</script>

<div bind:this={host} class="h-full w-full"></div>
