<script lang="ts">
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import type { Region } from '$lib/types';

	let {
		region,
		labels = true,
		value = $bindable<{ lat: number; lng: number } | null>(null)
	}: {
		region: Region;
		labels?: boolean;
		value?: { lat: number; lng: number } | null;
	} = $props();

	let host: HTMLDivElement;
	let map: L.Map | null = null;
	let marker: L.CircleMarker | null = null;

	const TILES = {
		labels: {
			url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
			attribution: '&copy; OpenStreetMap'
		},
		plain: {
			url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
			attribution: '&copy; OpenStreetMap, &copy; CARTO'
		}
	};

	$effect(() => {
		const tiles = labels ? TILES.labels : TILES.plain;
		map = L.map(host, { attributionControl: true, worldCopyJump: true });
		L.tileLayer(tiles.url, { attribution: tiles.attribution, maxZoom: 18 }).addTo(map);

		map.on('click', (event: L.LeafletMouseEvent) => {
			value = { lat: event.latlng.lat, lng: event.latlng.lng };
		});

		return () => {
			map?.remove();
			map = null;
			marker = null;
		};
	});

	// Encuadrar la region en juego: en CABA no tiene sentido arrancar viendo el mundo.
	$effect(() => {
		const [w, s, e, n] = region.bbox;
		map?.fitBounds(
			[
				[s, w],
				[n, e]
			],
			{ padding: [8, 8] }
		);
	});

	$effect(() => {
		if (!map) return;
		if (!value) {
			marker?.remove();
			marker = null;
			return;
		}
		if (marker) marker.setLatLng([value.lat, value.lng]);
		else {
			marker = L.circleMarker([value.lat, value.lng], {
				radius: 7,
				color: '#0f0f0f',
				weight: 2,
				fillColor: '#10b981',
				fillOpacity: 1
			}).addTo(map);
		}
	});
</script>

<div bind:this={host} class="h-full w-full"></div>
