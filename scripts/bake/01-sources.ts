/**
 * Descarga las fuentes libres que usa el horneado. Todo queda en data/sources,
 * que esta en .gitignore: se baja una vez y no se vuelve a tocar.
 */
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson';

export const SOURCES = [
	{
		name: 'ne_10m_admin_0_countries.geojson',
		url: `${NE}/ne_10m_admin_0_countries.geojson`,
		note: 'Natural Earth, dominio publico'
	},
	{
		name: 'ne_10m_admin_1_states_provinces.geojson',
		url: `${NE}/ne_10m_admin_1_states_provinces.geojson`,
		note: 'Natural Earth, dominio publico'
	},
	{
		name: 'cities1000.zip',
		url: 'https://download.geonames.org/export/dump/cities1000.zip',
		note: 'GeoNames, CC-BY 4.0'
	}
];

export const SOURCE_DIR = 'data/sources';

export async function ensureSources(dir = SOURCE_DIR): Promise<void> {
	mkdirSync(dir, { recursive: true });
	for (const source of SOURCES) {
		const path = `${dir}/${source.name}`;
		if (existsSync(path) && statSync(path).size > 0) {
			console.log(`  ya estaba: ${source.name}`);
			continue;
		}
		console.log(`  bajando ${source.name} (${source.note})…`);
		const res = await fetch(source.url);
		if (!res.ok || !res.body) throw new Error(`No se pudo bajar ${source.url}: ${res.status}`);
		await pipeline(Readable.fromWeb(res.body as never), createWriteStream(path));
		console.log(`  listo: ${source.name} (${(statSync(path).size / 1e6).toFixed(1)} MB)`);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	ensureSources()
		.then(() => console.log('fuentes listas'))
		.catch((err) => {
			console.error(err);
			process.exit(1);
		});
}
