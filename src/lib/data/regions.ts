import type { Region } from '../types';

export interface RegionsFile {
	version: number;
	generatedAt: string;
	regions: Record<string, Region>;
}

export interface ManifestEntry {
	count: number;
	shards: string[];
	source: 'seed' | 'bake';
}

export interface Manifest {
	version: number;
	builtAt: string;
	regions: Record<string, ManifestEntry>;
}

/**
 * Piso de ubicaciones para que una region sea jugable. Con el baker real cada
 * pais trae ~800, asi que este numero solo importa para el pool semilla.
 */
export const MIN_LOCATIONS = 20;

/** Debajo de esto la region se muestra con la etiqueta "pocas ubicaciones". */
export const THIN_LOCATIONS = 100;

let cache: { regions: Record<string, Region>; manifest: Manifest } | null = null;

export async function loadRegions(
	fetchImpl: typeof fetch = fetch
): Promise<{ regions: Record<string, Region>; manifest: Manifest }> {
	if (cache) return cache;
	const [regionsRes, manifestRes] = await Promise.all([
		fetchImpl('/data/regions.json'),
		fetchImpl('/data/pool/manifest.json')
	]);
	if (!regionsRes.ok) throw new Error('No se pudo cargar regions.json');
	const regionsFile: RegionsFile = await regionsRes.json();
	const manifest: Manifest = manifestRes.ok
		? await manifestRes.json()
		: { version: 1, builtAt: '', regions: {} };

	for (const [id, entry] of Object.entries(manifest.regions)) {
		if (regionsFile.regions[id]) {
			regionsFile.regions[id].locationCount = entry.count;
			regionsFile.regions[id].shards = entry.shards;
		}
	}

	cache = { regions: regionsFile.regions, manifest };
	return cache;
}

export function isPlayable(region: Region | undefined): boolean {
	return !!region && region.locationCount >= MIN_LOCATIONS;
}

export function isThin(region: Region | undefined): boolean {
	return !!region && region.locationCount < THIN_LOCATIONS;
}

/** Regiones jugables agrupadas por tipo, en el orden del menu. */
export function playableByKind(regions: Record<string, Region>): Record<string, Region[]> {
	const out: Record<string, Region[]> = {};
	for (const region of Object.values(regions)) {
		if (!isPlayable(region)) continue;
		(out[region.kind] ??= []).push(region);
	}
	for (const list of Object.values(out)) list.sort((a, b) => a.name.localeCompare(b.name, 'es'));
	return out;
}

/** Cadena de ampliacion completa desde una region hasta el mundo. */
export function escalationChain(regionId: string, regions: Record<string, Region>): Region[] {
	const chain: Region[] = [];
	let id: string | null = regionId;
	const seen = new Set<string>();
	while (id && regions[id] && !seen.has(id)) {
		seen.add(id);
		chain.push(regions[id]);
		id = regions[id].escalatesTo;
	}
	return chain;
}
