import type { GameLocation } from '../types';
import type { Rng } from '../game/rng';
import { clamp } from '../utils';

/**
 * Los shards viajan en formato columnar: a ~55 bytes por ubicacion, 800
 * ubicaciones son unos 45 KB (18 KB con gzip).
 */
export interface PoolShard {
	version: number;
	source: 'seed' | 'bake';
	/** Tabla de cadenas para los nombres de provincia. */
	admin1: string[];
	/** [lat, lng, panoId, cc, admin1Idx, ym, diff, pct, tags, heading] */
	rows: Array<[number, number, string | null, string, number, string, number, number, number, number | null]>;
}

const shardCache = new Map<string, Promise<GameLocation[]>>();

/** Id estable derivado de la coordenada: no depende del panoId, que caduca. */
export function locationId(lat: number, lng: number): string {
	const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
	let h = 2166136261;
	for (let i = 0; i < key.length; i++) {
		h ^= key.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(36).padStart(7, '0');
}

export function decodeShard(shard: PoolShard): GameLocation[] {
	return shard.rows.map((row) => {
		const [lat, lng, panoId, cc, admin1Idx, ym, diff, pct, tags, heading] = row;
		return {
			id: locationId(lat, lng),
			lat,
			lng,
			panoId: panoId ?? null,
			cc,
			admin1: shard.admin1[admin1Idx] ?? '',
			ym,
			diff,
			pct,
			tags,
			heading: heading ?? null
		};
	});
}

export function loadShard(path: string, fetchImpl: typeof fetch = fetch): Promise<GameLocation[]> {
	const cached = shardCache.get(path);
	if (cached) return cached;
	const promise = fetchImpl(`/data/pool/${path}`)
		.then((res) => {
			if (!res.ok) throw new Error(`Shard faltante: ${path}`);
			return res.json() as Promise<PoolShard>;
		})
		.then(decodeShard)
		.catch((err) => {
			shardCache.delete(path);
			throw err;
		});
	shardCache.set(path, promise);
	return promise;
}

export async function loadPool(
	shards: string[],
	fetchImpl: typeof fetch = fetch
): Promise<GameLocation[]> {
	const loaded = await Promise.all(shards.map((s) => loadShard(s, fetchImpl)));
	return loaded.flat();
}

/**
 * Filtra por ventana de percentil, ensanchandola si queda poca cosa. En Santa
 * Cruz no hay 800 ubicaciones para elegir, y una ronda igual tiene que salir.
 *
 * `strict` desactiva esa red: nunca devuelve algo excluido, aunque se quede
 * sin candidatos. Lo usa el desafio diario, donde repetir una ubicacion dentro
 * de la misma partida seria peor que tener cuatro rondas en vez de cinco.
 */
export function candidates(
	pool: readonly GameLocation[],
	pct: [number, number],
	exclude: ReadonlySet<string> = new Set(),
	minCandidates = 5,
	strict = false
): GameLocation[] {
	const fresh = pool.filter((loc) => !exclude.has(loc.id));
	const source = strict || fresh.length >= minCandidates ? fresh : pool.slice();
	if (!source.length) return [];
	for (let slack = 0; slack <= 100; slack += 10) {
		const lo = clamp(pct[0] - slack, 0, 100);
		const hi = clamp(pct[1] + slack, 0, 100);
		const hit = source.filter((loc) => loc.pct >= lo && loc.pct <= hi);
		if (hit.length >= minCandidates) return hit;
	}
	return source;
}

export function pickLocation(
	pool: readonly GameLocation[],
	pct: [number, number],
	rng: Rng,
	exclude: ReadonlySet<string> = new Set(),
	strict = false
): GameLocation | null {
	const options = candidates(pool, pct, exclude, strict ? 1 : 5, strict);
	if (!options.length) return null;
	return options[Math.floor(rng() * options.length)];
}

/** Elige n ubicaciones distintas: lo que necesita el desafio diario. */
export function pickSeries(
	pool: readonly GameLocation[],
	pct: [number, number],
	rng: Rng,
	count: number
): GameLocation[] {
	const taken = new Set<string>();
	const out: GameLocation[] = [];
	for (let i = 0; i < count; i++) {
		const loc = pickLocation(pool, pct, rng, taken, true);
		if (!loc) break;
		taken.add(loc.id);
		out.push(loc);
	}
	return out;
}
