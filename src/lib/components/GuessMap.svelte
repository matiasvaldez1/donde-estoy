<script lang="ts">
	import L from 'leaflet';
	import 'leaflet/dist/leaflet.css';
	import type { Region } from '$lib/types';
	import { mapColors } from '$lib/ui/theme';

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
	/* $state y no `let` suelto: el efecto que encuadra tiene que volver a correr
	   cuando el mapa se reconstruye, si no queda sin centro ni zoom. */
	let map = $state<L.Map | null>(null);
	let marker: L.CircleMarker | null = null;

	const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
	const ATTRIB = '&copy; Esri, HERE, Garmin, &copy; OpenStreetMap';

	$effect(() => {
		const instance = L.map(host, { attributionControl: true, worldCopyJump: true });
		// Ojo: Esri sirve como {z}/{y}/{x}, al revés que OSM.
		L.tileLayer(`${ESRI}/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
			attribution: ATTRIB,
			maxZoom: 16
		}).addTo(instance);
		if (labels) {
			L.tileLayer(`${ESRI}/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
				maxZoom: 16
			}).addTo(instance);
		}

		instance.on('click', (event: L.LeafletMouseEvent) => {
			value = { lat: event.latlng.lat, lng: event.latlng.lng };
		});

		/* El panel se agranda y achica con una transición CSS. Sin invalidateSize
		   Leaflet queda con el tamaño viejo: aparecen franjas grises y, peor, la
		   conversión de click a coordenada apunta mal. */
		const observer = new ResizeObserver(() => instance.invalidateSize({ animate: false }));
		observer.observe(host);

		map = instance;
		marker = null;

		return () => {
			observer.disconnect();
			instance.remove();
			map = null;
			marker = null;
		};
	});

	// Encuadrar la región en juego: en CABA no tiene sentido arrancar viendo el mundo.
	$effect(() => {
		const instance = map;
		if (!instance) return;
		const [w, s, e, n] = region.bbox;
		instance.fitBounds(
			[
				[s, w],
				[n, e]
			],
			{ padding: [8, 8] }
		);
	});

	$effect(() => {
		const instance = map;
		if (!instance) return;
		if (!value) {
			marker?.remove();
			marker = null;
			return;
		}
		if (marker) marker.setLatLng([value.lat, value.lng]);
		else {
			const c = mapColors();
			marker = L.circleMarker([value.lat, value.lng], {
				radius: 7,
				color: c.ink,
				weight: 3,
				fillColor: c.truth,
				fillOpacity: 1
			}).addTo(instance);
		}
	});
</script>

<div bind:this={host} class="h-full w-full"></div>
