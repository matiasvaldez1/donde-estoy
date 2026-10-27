import { cacheKey, readCache, sleep, writeCache } from './cache.ts';
import type { BBox } from '../../../src/lib/types.ts';

/**
 * Los endpoints publicos dan unas dos consultas por IP y cortan rapido. Vamos
 * en serie, con pausa, cacheando cada respuesta cruda: el horneado es offline
 * y se puede reanudar, asi que tardar horas no es un problema.
 */
const ENDPOINTS = [
	'https://overpass-api.de/api/interpreter',
	'https://overpass.kumi.systems/api/interpreter',
	'https://overpass.private.coffee/api/interpreter'
];

export const ROAD_CLASSES = [
	'motorway',
	'trunk',
	'primary',
	'secondary',
	'tertiary',
	'unclassified',
	'residential'
];

/** En el medio de la nada no hay otra cosa que huellas y caminos vecinales. */
export const SPARSE_ROAD_CLASSES = [...ROAD_CLASSES, 'track', 'service'];

export interface OverpassWay {
	id: number;
	tags?: Record<string, string>;
	geometry?: Array<{ lat: number; lon: number }>;
}

export interface OverpassResponse {
	elements: OverpassWay[];
}

let endpointIndex = 0;

export async function overpassWays(
	bbox: BBox,
	roadClasses: string[],
	cacheDir: string,
	delayMs = 3000
): Promise<OverpassWay[]> {
	const [w, s, e, n] = bbox;
	const query = `[out:json][timeout:180];way["highway"~"^(${roadClasses.join('|')})$"](${s},${w},${n},${e});out geom;`;
	const path = `${cacheDir}/${cacheKey(query)}.json`;

	const cached = readCache<OverpassResponse>(path);
	if (cached) return cached.elements ?? [];

	for (let attempt = 0; attempt < ENDPOINTS.length * 2; attempt++) {
		const endpoint = ENDPOINTS[endpointIndex % ENDPOINTS.length];
		endpointIndex++;
		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({ data: query })
			});
			if (res.status === 429 || res.status === 504) {
				await sleep(delayMs * (attempt + 2));
				continue;
			}
			if (!res.ok) {
				await sleep(delayMs);
				continue;
			}
			const json = (await res.json()) as OverpassResponse;
			writeCache(path, json);
			await sleep(delayMs);
			return json.elements ?? [];
		} catch {
			await sleep(delayMs * 2);
		}
	}
	console.warn(`  overpass sin respuesta para ${bbox.join(',')}`);
	return [];
}
