import type { GameLocation, Region } from '../src/lib/types';
import { bboxDiagonalKm } from '../src/lib/utils';

export function region(
	id: string,
	bbox: [number, number, number, number],
	escalatesTo: string | null = null,
	kind: Region['kind'] = 'country'
): Region {
	return {
		id,
		name: id,
		kind,
		parentId: null,
		childIds: [],
		shards: [`${id}.json`],
		bbox,
		center: [(bbox[1] + bbox[3]) / 2, (bbox[0] + bbox[2]) / 2],
		diagonalKm: Math.round(bboxDiagonalKm(bbox)),
		locationCount: 100,
		escalatesTo
	};
}

export const AR = region('ar', [-73.6, -55.1, -53.6, -21.8], 'cono-sur');
export const CONO_SUR = region('cono-sur', [-75.7, -55.98, -53.1, -17.5], 'latam');
export const LATAM = region('latam', [-118.4, -56, -34.8, 32.7], 'world');
export const WORLD = region('world', [-180, -60, 180, 75], null);

export const MENDOZA = region('ar-mz', [-70.6, -37.6, -66.5, -31.9], 'ar', 'admin1');

export const REGIONS: Record<string, Region> = {
	'ar-mz': MENDOZA,
	ar: AR,
	'cono-sur': CONO_SUR,
	latam: LATAM,
	world: WORLD
};

export function location(partial: Partial<GameLocation> = {}): GameLocation {
	return {
		id: 'loc1',
		lat: -34.6037,
		lng: -58.3816,
		panoId: null,
		cc: 'ar',
		admin1: 'Ciudad Autónoma de Buenos Aires',
		ym: '2023-01',
		diff: 20,
		pct: 25,
		tags: 16,
		heading: null,
		...partial
	};
}
