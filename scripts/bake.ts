/**
 * Orquestador del horneado.
 *
 *   pnpm bake --region ar --target 800
 *   pnpm bake --region ar --limit 50 --dry-run     # sin tocar Google
 *   pnpm bake --region sc --sparse                 # zonas vacias
 *
 * Cada etapa es reanudable y cachea todo lo que sale a la red, asi que cortar
 * a la mitad y volver a correrlo no cuesta nada.
 */
import { existsSync, readFileSync } from 'node:fs';
import { seededRng } from '../src/lib/game/rng.ts';
import { MIN_LOCATIONS } from '../src/lib/data/regions.ts';
import type { Region } from '../src/lib/types.ts';
import { ensureSources, SOURCE_DIR } from './bake/01-sources.ts';
import { generateCandidates } from './bake/02-candidates.ts';
import { hitRate, validateCandidates } from './bake/03-validate.ts';
import { loadAdminFeatures, scoreAll } from './bake/04-score.ts';
import type { Scored } from './bake/04-score.ts';
import { emitShard, updateManifest } from './bake/05-emit.ts';
import { CityIndex, loadCities } from './bake/lib/cities.ts';

function arg(name: string, fallback?: string): string | undefined {
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : fallback;
}

const has = (name: string): boolean => process.argv.includes(`--${name}`);

/** .env a mano: una dependencia menos para leer dos variables. */
function loadEnv(): void {
	if (!existsSync('.env')) return;
	for (const line of readFileSync('.env', 'utf8').split('\n')) {
		const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
		if (match && !process.env[match[1]]) {
			process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
		}
	}
}

/** Nombres comparables sin pelearse con tildes. */
function fold(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.trim();
}

async function main(): Promise<void> {
	loadEnv();

	const regionId = (arg('region') ?? 'ar').toLowerCase();
	const target = Number(arg('target', '800'));
	const limit = arg('limit') ? Number(arg('limit')) : undefined;
	const dryRun = has('dry-run');
	const sparse = has('sparse');
	const key = process.env.GOOGLE_MAPS_BAKE_KEY ?? '';

	if (!dryRun && !key) {
		throw new Error(
			'Falta GOOGLE_MAPS_BAKE_KEY en .env. Las consultas de metadata son gratis y sin cuota, ' +
				'pero necesitan una clave con Street View Static API habilitada.'
		);
	}

	const regions = (
		JSON.parse(readFileSync('static/data/regions.json', 'utf8')) as { regions: Record<string, Region> }
	).regions;
	const region = regions[regionId];
	if (!region) throw new Error(`No conozco la región ${regionId}`);

	console.log(`horneando ${region.name} (${regionId})`);
	console.log(`objetivo: ${target} ubicaciones · diagonal ${region.diagonalKm} km`);

	console.log('\n[1/5] fuentes');
	await ensureSources();

	console.log('\n[2/5] candidatos sobre geometría de calles');
	const rng = seededRng(`bake:${regionId}`);
	// La tasa de acierto ronda 60-90% donde hay cobertura: pedimos de mas.
	const candidates = await generateCandidates({
		bbox: region.bbox,
		target: Math.ceil(target * 1.8),
		rng,
		cacheDir: 'data/cache/overpass',
		outPath: `data/raw/${regionId}/candidates.jsonl`,
		sparse,
		delayMs: 3000
	});
	console.log(`  ${candidates.length} candidatos`);

	console.log('\n[3/5] validación contra la metadata de Street View');
	const { validated, report } = await validateCandidates({
		candidates,
		key,
		inPath: `data/raw/${regionId}/candidates.jsonl`,
		outPath: `data/raw/${regionId}/validated.jsonl`,
		cacheDir: 'data/cache/svmeta',
		radius: sparse ? 100 : 50,
		limit,
		dryRun
	});
	console.log(
		`  consultadas ${report.tried} · aceptadas ${report.accepted} · photospheres ${report.photospheres} · ` +
			`sin cobertura ${report.empty} · repetidas ${report.duplicates}`
	);
	if (report.tried) console.log(`  tasa de acierto: ${(hitRate(report) * 100).toFixed(1)}%`);

	if (dryRun) {
		console.log('\n(dry-run) hasta acá llega sin tocar Google.');
		return;
	}
	if (!validated.length) {
		console.log('\nNo quedó nada validado. Probá con --sparse o subí el objetivo.');
		return;
	}

	console.log('\n[4/5] país, provincia y dificultad');
	const countries = loadAdminFeatures(`${SOURCE_DIR}/ne_10m_admin_0_countries.geojson`, ['ADMIN', 'NAME']);
	const provinces = loadAdminFeatures(`${SOURCE_DIR}/ne_10m_admin_1_states_provinces.geojson`, ['name', 'NAME']);
	const cities = new CityIndex(loadCities(SOURCE_DIR));
	const scored = scoreAll({
		validated,
		countries,
		provinces,
		cities,
		forceCc: region.kind === 'country' ? regionId : undefined
	});

	console.log('\n[5/5] shards');
	const counts: Record<string, number> = {};
	counts[regionId] = emitShard(regionId, scored);

	// Un shard por provincia, para que cada recorte chico se baje solo.
	const children = Object.values(regions).filter(
		(r) => r.parentId === regionId && (r.kind === 'admin1' || r.kind === 'city')
	);
	const byProvince = new Map<string, Scored[]>();
	for (const item of scored) {
		const list = byProvince.get(fold(item.admin1)) ?? [];
		list.push(item);
		byProvince.set(fold(item.admin1), list);
	}
	for (const child of children) {
		const list = byProvince.get(fold(child.name)) ?? [];
		if (list.length) counts[child.id] = emitShard(child.id, list);
	}

	updateManifest(counts);

	console.log('\nresumen');
	for (const [id, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
		const flag = count >= MIN_LOCATIONS ? '' : `  (por debajo del piso de ${MIN_LOCATIONS}, no va a aparecer)`;
		console.log(`  ${id.padEnd(10)} ${String(count).padStart(5)}${flag}`);
	}
	const sinProvincia = scored.filter((s) => !s.admin1).length;
	if (sinProvincia) console.log(`  ${sinProvincia} sin provincia resuelta (quedan igual en el shard del país)`);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
