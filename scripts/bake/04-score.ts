/**
 * Resuelve pais y provincia por point-in-polygon local (sin geocoder, sin
 * costo) y calcula la dificultad con el mismo modulo que usa el cliente.
 */
import { readFileSync } from 'node:fs';
import { difficultyScore, percentileRanks } from '../../src/lib/game/difficulty.ts';
import { featureAt, ringsBBox } from '../../src/lib/data/admin.ts';
import type { AdminFeature } from '../../src/lib/data/admin.ts';
import { geoJsonRings } from './lib/geo.ts';
import { CityIndex } from './lib/cities.ts';
import type { Validated } from './03-validate.ts';

export interface Scored extends Validated {
	cc: string;
	admin1: string;
	diff: number;
	pct: number;
}

interface GeoJsonFeature {
	properties: Record<string, unknown>;
	geometry: { type: string; coordinates: unknown } | null;
}

export function loadAdminFeatures(
	path: string,
	nameKeys: string[],
	filter?: (props: Record<string, unknown>) => boolean
): AdminFeature[] {
	const data = JSON.parse(readFileSync(path, 'utf8')) as { features: GeoJsonFeature[] };
	const out: AdminFeature[] = [];
	for (const feature of data.features) {
		if (!feature.geometry) continue;
		if (filter && !filter(feature.properties)) continue;
		const polygons = geoJsonRings(feature.geometry);
		if (!polygons.length) continue;
		const name = nameKeys.map((k) => feature.properties[k]).find((v) => typeof v === 'string');
		out.push({
			id: String(feature.properties.iso_a2 ?? feature.properties.iso_3166_2 ?? name ?? ''),
			name: String(name ?? ''),
			bbox: ringsBBox(polygons),
			polygons
		});
	}
	return out;
}

export interface ScoreOptions {
	validated: Validated[];
	countries: AdminFeature[];
	provinces: AdminFeature[];
	cities: CityIndex;
	/** Forzar el pais cuando se hornea un recorte conocido. */
	forceCc?: string;
}

export function scoreAll(options: ScoreOptions): Scored[] {
	const { validated, countries, provinces, cities, forceCc } = options;

	const partial = validated.map((item) => {
		const country = featureAt(countries, item.lng, item.lat);
		const province = featureAt(provinces, item.lng, item.lat);
		const cc = (forceCc ?? country?.id ?? '').toLowerCase();
		const captureYear = Number(item.ym.slice(0, 4)) || 2015;

		const diff = difficultyScore({
			distToCity50kKm: cities.nearestKm(item.lat, item.lng, 50_000),
			distToCity1kKm: cities.nearestKm(item.lat, item.lng, 1_000),
			roadClass: item.roadClass,
			surface: item.surface,
			roadDensity: item.roadDensity,
			captureYear,
			cc
		});

		return { ...item, cc, admin1: province?.name ?? '', diff };
	});

	// El percentil se calcula dentro del recorte horneado: "dificil para CABA"
	// no se parece en nada a "dificil para Santa Cruz".
	const pcts = percentileRanks(partial.map((p) => p.diff));
	return partial.map((p, i) => ({ ...p, pct: pcts[i] }));
}
