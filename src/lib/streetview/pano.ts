import type { GameLocation } from '../types';

/**
 * Carga de la Maps JavaScript API y resolucion de panoramas.
 *
 * El pool guarda lat/lng como dato duradero y el panoId solo como cache: si
 * Google retira un panorama, la ronda cae al mas cercano en vez de mostrar una
 * pantalla negra.
 */

export type PanoDriver = 'js' | 'embed';

export function mapsKey(): string {
	return (import.meta.env.VITE_MAPS_KEY as string | undefined) ?? '';
}

export function panoDriver(): PanoDriver {
	return (import.meta.env.VITE_PANO_DRIVER as PanoDriver | undefined) === 'embed' ? 'embed' : 'js';
}

export function hasKey(): boolean {
	return mapsKey().trim().length > 0;
}

const CALLBACK = '__dondeEstoyMapsReady';

let loading: Promise<void> | null = null;

export function loadMaps(): Promise<void> {
	if (loading) return loading;
	if (!hasKey()) {
		return Promise.reject(new Error('Falta VITE_MAPS_KEY'));
	}
	loading = new Promise<void>((resolve, reject) => {
		const w = window as unknown as Record<string, unknown>;
		if ((w.google as { maps?: unknown } | undefined)?.maps) {
			resolve();
			return;
		}
		w[CALLBACK] = () => resolve();
		const script = document.createElement('script');
		const params = new URLSearchParams({
			key: mapsKey(),
			v: 'weekly',
			loading: 'async',
			callback: CALLBACK
		});
		script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
		script.async = true;
		script.onerror = () => reject(new Error('No se pudo cargar la Maps JavaScript API'));
		document.head.appendChild(script);
	}).catch((err) => {
		loading = null;
		throw err;
	});
	return loading;
}

/** Los typings de la API declaran el status como union de strings. */
type PanoStatus = 'OK' | 'UNKNOWN_ERROR' | 'ZERO_RESULTS';

export interface ResolvedPano {
	panoId: string;
	lat: number;
	lng: number;
	/** Rumbo sugerido, del dato de la calle o del propio panorama. */
	heading: number;
}

/**
 * Prefiere el panoId guardado y cae a buscar por coordenada. `source: outdoor`
 * descarta las fotos de interiores de comercios.
 */
export function resolvePano(location: GameLocation, radius = 100): Promise<ResolvedPano> {
	const service = new google.maps.StreetViewService();
	const request: google.maps.StreetViewLocationRequest = {
		location: { lat: location.lat, lng: location.lng },
		radius,
		source: google.maps.StreetViewSource.OUTDOOR
	};

	return new Promise((resolve, reject) => {
		const done = (data: google.maps.StreetViewPanoramaData | null, status: PanoStatus) => {
			if (status !== 'OK' || !data?.location) {
				reject(new Error('Sin panorama cerca de esta coordenada'));
				return;
			}
			const pos = data.location.latLng;
			resolve({
				panoId: data.location.pano ?? '',
				lat: pos?.lat() ?? location.lat,
				lng: pos?.lng() ?? location.lng,
				heading: location.heading ?? headingFromLinks(data) ?? 0
			});
		};

		if (location.panoId) {
			service.getPanorama({ pano: location.panoId }, (data, status) => {
				if (status === 'OK') done(data, status);
				else service.getPanorama(request, done);
			});
			return;
		}
		service.getPanorama(request, done);
	});
}

/** Mirar hacia donde sigue la calle es mejor que mirar una pared. */
function headingFromLinks(data: google.maps.StreetViewPanoramaData): number | null {
	const link = data.links?.find((l) => typeof l.heading === 'number');
	return link?.heading ?? null;
}

/** URL del iframe del Embed API, para el driver gratis e ilimitado. */
export function embedUrl(location: GameLocation, heading = 0): string {
	const params = new URLSearchParams({
		key: mapsKey(),
		location: `${location.lat},${location.lng}`,
		heading: String(heading),
		pitch: '0',
		fov: '90'
	});
	return `https://www.google.com/maps/embed/v1/streetview?${params}`;
}
