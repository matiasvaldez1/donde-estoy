import type { BBox } from '../../../src/lib/types.ts';
import type { Ring } from '../../../src/lib/data/admin.ts';
import { haversineKm } from '../../../src/lib/utils.ts';

export interface Tile {
	bbox: BBox;
}

/** Parte una bbox en celdas de `step` grados: Overpass no traga paises enteros. */
export function tiles(bbox: BBox, step = 1): Tile[] {
	const [w, s, e, n] = bbox;
	const out: Tile[] = [];
	for (let lng = Math.floor(w); lng < e; lng += step) {
		for (let lat = Math.floor(s); lat < n; lat += step) {
			out.push({ bbox: [lng, lat, Math.min(lng + step, e), Math.min(lat + step, n)] });
		}
	}
	return out;
}

/** Longitud de una polilinea en km. */
export function wayLengthKm(points: Array<{ lat: number; lon: number }>): number {
	let total = 0;
	for (let i = 1; i < points.length; i++) {
		total += haversineKm(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
	}
	return total;
}

/** Rumbo inicial del segmento, en grados. */
export function bearing(aLat: number, aLng: number, bLat: number, bLng: number): number {
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLng = toRad(bLng - aLng);
	const y = Math.sin(dLng) * Math.cos(toRad(bLat));
	const x =
		Math.cos(toRad(aLat)) * Math.sin(toRad(bLat)) -
		Math.sin(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.cos(dLng);
	return Math.round((((Math.atan2(y, x) * 180) / Math.PI + 360) % 360));
}

/** Desplaza un punto unos metros en una direccion al azar. */
export function jitter(lat: number, lng: number, meters: number, rnd = Math.random): [number, number] {
	const angle = rnd() * 2 * Math.PI;
	const dLat = (meters * Math.cos(angle)) / 111_320;
	const dLng = (meters * Math.sin(angle)) / (111_320 * Math.cos((lat * Math.PI) / 180));
	return [lat + dLat, lng + dLng];
}

/**
 * Rejilla espacial para descartar puntos pegados: sin esto el pool termina
 * siendo la misma avenida doscientas veces.
 */
export class SpatialGrid {
	private cells = new Set<string>();

	constructor(private readonly cellMeters: number) {}

	private key(lat: number, lng: number): string {
		const size = this.cellMeters / 111_320;
		return `${Math.floor(lat / size)}:${Math.floor(lng / size)}`;
	}

	has(lat: number, lng: number): boolean {
		return this.cells.has(this.key(lat, lng));
	}

	add(lat: number, lng: number): void {
		this.cells.add(this.key(lat, lng));
	}
}

export function geoJsonRings(geometry: {
	type: string;
	coordinates: unknown;
}): Ring[][] {
	if (geometry.type === 'Polygon') return [geometry.coordinates as Ring[]];
	if (geometry.type === 'MultiPolygon') return geometry.coordinates as Ring[][];
	return [];
}
