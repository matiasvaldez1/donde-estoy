/**
 * Escribe los shards columnares, el manifest y las cuentas por region.
 * Los shards se commitean: un juego sin datos no es un juego, y pesan decenas
 * de KB.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Scored } from './04-score.ts';
import type { Manifest } from '../../src/lib/data/regions.ts';
import type { PoolShard } from '../../src/lib/data/pool.ts';

export const POOL_DIR = 'static/data/pool';

export function toShard(locations: Scored[]): PoolShard {
	const admin1 = [...new Set(locations.map((l) => l.admin1))];
	return {
		version: 1,
		source: 'bake',
		admin1,
		rows: locations.map((l) => [
			Number(l.lat.toFixed(5)),
			Number(l.lng.toFixed(5)),
			l.panoId,
			l.cc,
			admin1.indexOf(l.admin1),
			l.ym,
			l.diff,
			l.pct,
			0,
			l.heading
		])
	};
}

export function emitShard(regionId: string, locations: Scored[], dir = POOL_DIR): number {
	if (!locations.length) return 0;
	mkdirSync(dir, { recursive: true });
	writeFileSync(`${dir}/${regionId}.json`, JSON.stringify(toShard(locations)) + '\n');
	return locations.length;
}

export function updateManifest(
	entries: Record<string, number>,
	dir = POOL_DIR
): Manifest {
	const path = `${dir}/manifest.json`;
	const manifest: Manifest = existsSync(path)
		? (JSON.parse(readFileSync(path, 'utf8')) as Manifest)
		: { version: 1, builtAt: '', regions: {} };

	for (const [regionId, count] of Object.entries(entries)) {
		manifest.regions[regionId] = {
			count,
			shards: [`${regionId}.json`],
			source: 'bake'
		};
	}
	manifest.builtAt = new Date().toISOString();
	writeFileSync(path, JSON.stringify(manifest, null, '\t') + '\n');
	return manifest;
}

/**
 * Muestra estratificado para los recortes anchos: Latinoamerica no baja veinte
 * shards de pais, baja uno solo que ya viene equilibrado por dificultad.
 */
export function emitMix(
	regionId: string,
	byCountry: Record<string, Scored[]>,
	perCountry: number,
	dir = POOL_DIR
): number {
	const picked: Scored[] = [];
	for (const locations of Object.values(byCountry)) {
		const sorted = locations.slice().sort((a, b) => a.pct - b.pct);
		const step = Math.max(1, Math.floor(sorted.length / perCountry));
		for (let i = 0; i < sorted.length && picked.length < perCountry * Object.keys(byCountry).length; i += step) {
			picked.push(sorted[i]);
		}
	}
	if (!picked.length) return 0;
	mkdirSync(`${dir}/_mix`, { recursive: true });
	writeFileSync(`${dir}/_mix/${regionId}.json`, JSON.stringify(toShard(picked)) + '\n');
	return picked.length;
}
