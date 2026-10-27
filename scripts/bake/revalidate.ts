/**
 * Repasa el pool entero contra la metadata (gratis) y poda lo que Google
 * retiró. Conviene correrlo cada tanto: los panoId caducan, las coordenadas no.
 *
 *   pnpm bake:revalidate --region ar
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { lookup, lookupAll } from './lib/svmeta.ts';
import type { PoolShard } from '../../src/lib/data/pool.ts';

function arg(name: string, fallback?: string): string | undefined {
	const index = process.argv.indexOf(`--${name}`);
	return index >= 0 ? process.argv[index + 1] : fallback;
}

function loadEnv(): void {
	if (!existsSync('.env')) return;
	for (const line of readFileSync('.env', 'utf8').split('\n')) {
		const match = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
		if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
	}
}

async function main(): Promise<void> {
	loadEnv();
	const regionId = (arg('region') ?? 'ar').toLowerCase();
	const key = process.env.GOOGLE_MAPS_BAKE_KEY ?? '';
	if (!key) throw new Error('Falta GOOGLE_MAPS_BAKE_KEY en .env');

	const path = `static/data/pool/${regionId}.json`;
	if (!existsSync(path)) throw new Error(`No hay shard para ${regionId}`);

	const shard = JSON.parse(readFileSync(path, 'utf8')) as PoolShard;
	console.log(`repasando ${shard.rows.length} ubicaciones de ${regionId}`);

	const vivos: PoolShard['rows'] = [];
	let refrescados = 0;

	await lookupAll(shard.rows, 10, async (row) => {
		const [lat, lng] = row;
		const result = await lookup(lat, lng, key, 100, 'data/cache/svmeta-revalidate');
		if (!result.ok) return;
		if (result.panoId !== row[2]) refrescados++;
		row[2] = result.panoId ?? null;
		row[5] = result.ym ?? row[5];
		vivos.push(row);
	});

	const podados = shard.rows.length - vivos.length;
	shard.rows = vivos;
	writeFileSync(path, JSON.stringify(shard) + '\n');
	console.log(`vivas ${vivos.length} · podadas ${podados} · panoId refrescados ${refrescados}`);
	if (podados) console.log('acordate de correr updateManifest o rehornear para actualizar las cuentas');
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
