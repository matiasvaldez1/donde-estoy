/**
 * Genera candidatos muestreando geometria de calles de OSM.
 *
 * Tirar puntos al azar dentro del poligono de un pais acierta menos del 5% de
 * las veces; muestrear sobre la calle misma acierta entre 60 y 90% donde hay
 * cobertura. Por eso el muestreo uniforme queda solo de respaldo.
 */
import { appendLine, readLines } from './lib/cache.ts';
import { bearing, jitter, SpatialGrid, tiles, wayLengthKm } from './lib/geo.ts';
import { overpassWays, ROAD_CLASSES, SPARSE_ROAD_CLASSES } from './lib/overpass.ts';
import { weightedIndex } from '../../src/lib/game/rng.ts';
import type { Rng } from '../../src/lib/game/rng.ts';
import type { BBox } from '../../src/lib/types.ts';

export interface Candidate {
	lat: number;
	lng: number;
	roadClass: string;
	surface?: string;
	heading: number;
	/** Km de via en la celda, proxy de densidad urbana. */
	roadDensity: number;
}

export interface CandidateOptions {
	bbox: BBox;
	target: number;
	rng: Rng;
	cacheDir: string;
	outPath: string;
	/** Zonas vacias: sumar huellas y caminos vecinales o no sale nada. */
	sparse?: boolean;
	tileStep?: number;
	/** Distancia minima entre candidatos, en metros. */
	spacing?: number;
	delayMs?: number;
}

export async function generateCandidates(options: CandidateOptions): Promise<Candidate[]> {
	const {
		bbox,
		target,
		rng,
		cacheDir,
		outPath,
		sparse = false,
		tileStep = 1,
		spacing = 250,
		delayMs = 3000
	} = options;

	const existing = readLines<Candidate>(outPath);
	const grid = new SpatialGrid(spacing);
	for (const candidate of existing) grid.add(candidate.lat, candidate.lng);
	if (existing.length >= target) {
		console.log(`  ya habia ${existing.length} candidatos, nada que hacer`);
		return existing;
	}

	const classes = sparse ? SPARSE_ROAD_CLASSES : ROAD_CLASSES;
	const cells = shuffleTiles(tiles(bbox, tileStep), rng);
	// Tope por celda: sin esto, el 80% del pool cae en el area metropolitana.
	const perTile = Math.max(3, Math.ceil((target * 2) / Math.max(1, cells.length)));

	const out = [...existing];
	for (const tile of cells) {
		if (out.length >= target) break;
		const ways = await overpassWays(tile.bbox, classes, cacheDir, delayMs);
		const usable = ways.filter((w) => (w.geometry?.length ?? 0) >= 2);
		if (!usable.length) continue;

		const lengths = usable.map((w) => wayLengthKm(w.geometry!));
		const density = lengths.reduce((a, b) => a + b, 0) / tileArea(tile.bbox);

		let added = 0;
		for (let attempt = 0; attempt < perTile * 8 && added < perTile && out.length < target; attempt++) {
			// Ponderado por largo: una ruta de 40 km pesa mas que un pasaje.
			const way = usable[weightedIndex(lengths, rng)];
			const points = way.geometry!;
			const index = Math.floor(rng() * (points.length - 1));
			const a = points[index];
			const b = points[index + 1];
			const [lat, lng] = jitter(a.lat, a.lon, 10, rng);
			if (grid.has(lat, lng)) continue;
			grid.add(lat, lng);

			const candidate: Candidate = {
				lat: Number(lat.toFixed(6)),
				lng: Number(lng.toFixed(6)),
				roadClass: way.tags?.highway ?? 'unclassified',
				surface: way.tags?.surface,
				heading: bearing(a.lat, a.lon, b.lat, b.lon),
				roadDensity: Number(density.toFixed(3))
			};
			appendLine(outPath, candidate);
			out.push(candidate);
			added++;
		}
		console.log(`  ${tile.bbox.join(',')}: +${added} (total ${out.length}/${target})`);
	}
	return out;
}

function tileArea(bbox: BBox): number {
	const [w, s, e, n] = bbox;
	const latKm = (n - s) * 111;
	const lngKm = (e - w) * 111 * Math.cos((((s + n) / 2) * Math.PI) / 180);
	return Math.max(1, latKm * lngKm);
}

function shuffleTiles<T>(items: T[], rng: Rng): T[] {
	const out = items.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}
