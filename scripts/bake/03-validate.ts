/**
 * Valida cada candidato contra la metadata de Street View: gratis, sin cuota y
 * sin bajar un solo pixel. Se queda unicamente con cobertura oficial del auto
 * de Google, que es la que tiene calidad y altura consistentes.
 */
import { appendLine, readLines } from './lib/cache.ts';
import { SpatialGrid } from './lib/geo.ts';
import { lookup, lookupAll } from './lib/svmeta.ts';
import type { Candidate } from './02-candidates.ts';

export interface Validated extends Candidate {
	panoId: string;
	ym: string;
}

export interface ValidateOptions {
	candidates: Candidate[];
	key: string;
	inPath: string;
	outPath: string;
	cacheDir: string;
	radius?: number;
	concurrency?: number;
	limit?: number;
	dryRun?: boolean;
}

export interface ValidateReport {
	tried: number;
	accepted: number;
	photospheres: number;
	empty: number;
	duplicates: number;
}

export async function validateCandidates(options: ValidateOptions): Promise<{
	validated: Validated[];
	report: ValidateReport;
}> {
	const { candidates, key, outPath, cacheDir, radius = 50, concurrency = 10, limit, dryRun } = options;

	const existing = readLines<Validated>(outPath);
	const seenPano = new Set(existing.map((v) => v.panoId));
	const grid = new SpatialGrid(50);
	for (const v of existing) grid.add(v.lat, v.lng);

	const pending = candidates.slice(existing.length, limit ? existing.length + limit : undefined);
	const report: ValidateReport = {
		tried: 0,
		accepted: 0,
		photospheres: 0,
		empty: 0,
		duplicates: existing.length ? 0 : 0
	};
	const accepted: Validated[] = [...existing];

	if (dryRun) {
		console.log(`  (dry-run) se consultarian ${pending.length} coordenadas`);
		return { validated: accepted, report };
	}

	await lookupAll(pending, concurrency, async (candidate) => {
		report.tried++;
		const result = await lookup(candidate.lat, candidate.lng, key, radius, cacheDir);
		if (!result.ok) {
			if (result.reason === 'photosphere') report.photospheres++;
			else report.empty++;
			return;
		}
		const lat = result.lat ?? candidate.lat;
		const lng = result.lng ?? candidate.lng;
		// El panorama encajado puede caer encima de otro ya aceptado.
		if (seenPano.has(result.panoId!) || grid.has(lat, lng)) {
			report.duplicates++;
			return;
		}
		seenPano.add(result.panoId!);
		grid.add(lat, lng);

		const validated: Validated = {
			...candidate,
			lat: Number(lat.toFixed(6)),
			lng: Number(lng.toFixed(6)),
			panoId: result.panoId!,
			ym: result.ym!
		};
		appendLine(outPath, validated);
		accepted.push(validated);
		report.accepted++;
	});

	return { validated: accepted, report };
}

export function hitRate(report: ValidateReport): number {
	return report.tried ? report.accepted / report.tried : 0;
}
