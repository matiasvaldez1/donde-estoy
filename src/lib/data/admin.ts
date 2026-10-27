import type { BBox } from '../types';

/**
 * Point-in-polygon sobre GeoJSON. Lo usa el baker (04-score.ts) para resolver
 * pais y provincia sin pagar un geocoder, y el cliente cuando hay poligonos
 * simplificados disponibles.
 */
export type Ring = Array<[number, number]>;

/** Ray casting. El anillo viene en [lng, lat], como manda GeoJSON. */
export function pointInRing(lng: number, lat: number, ring: Ring): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}

/** Primer anillo es el exterior, el resto son huecos. */
export function pointInPolygon(lng: number, lat: number, polygon: Ring[]): boolean {
	if (!polygon.length || !pointInRing(lng, lat, polygon[0])) return false;
	for (let i = 1; i < polygon.length; i++) {
		if (pointInRing(lng, lat, polygon[i])) return false;
	}
	return true;
}

export function pointInMultiPolygon(lng: number, lat: number, polygons: Ring[][]): boolean {
	return polygons.some((polygon) => pointInPolygon(lng, lat, polygon));
}

export interface AdminFeature {
	id: string;
	name: string;
	bbox: BBox;
	polygons: Ring[][];
}

export function bboxContains(bbox: BBox, lng: number, lat: number): boolean {
	return lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
}

/** La bbox primero: descarta el 99% de los candidatos sin recorrer anillos. */
export function featureAt(
	features: readonly AdminFeature[],
	lng: number,
	lat: number
): AdminFeature | null {
	for (const feature of features) {
		if (!bboxContains(feature.bbox, lng, lat)) continue;
		if (pointInMultiPolygon(lng, lat, feature.polygons)) return feature;
	}
	return null;
}

export function ringsBBox(polygons: Ring[][]): BBox {
	let w = 180;
	let s = 90;
	let e = -180;
	let n = -90;
	for (const polygon of polygons) {
		for (const [lng, lat] of polygon[0] ?? []) {
			if (lng < w) w = lng;
			if (lng > e) e = lng;
			if (lat < s) s = lat;
			if (lat > n) n = lat;
		}
	}
	return [w, s, e, n];
}
