/**
 * Pool semilla: ubicaciones de arranque escritas a mano para que el juego sea
 * jugable antes de tener la clave de Google y correr el baker.
 *
 * No son datos horneados: la dificultad esta etiquetada a ojo por categoria y
 * las coordenadas son aproximadas (el cliente engancha el panorama mas cercano
 * dentro de 100 m). `pnpm bake --region AR` las reemplaza por ~800 verificadas.
 *
 *   pnpm tsx scripts/seed-pool.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { percentileRanks } from '../src/lib/game/difficulty.ts';
import { TAG } from '../src/lib/types.ts';

type Cat = 'core' | 'outer' | 'city' | 'town';

/** Dificultad a ojo por categoria, en la misma escala 0-100 del baker. */
const DIFF: Record<Cat, number> = { core: 12, outer: 22, city: 32, town: 48 };
const TAGS: Record<Cat, number> = {
	core: TAG.URBAN,
	outer: TAG.URBAN,
	city: TAG.URBAN,
	town: TAG.RURAL
};

const CABA = 'Ciudad Autónoma de Buenos Aires';
const BA = 'Buenos Aires';

/** [lat, lng, provincia, categoria] */
const SEED: Array<[number, number, string, Cat]> = [
	// --- CABA ---
	[-34.6037, -58.3816, CABA, 'core'], // Obelisco
	[-34.6083, -58.3722, CABA, 'core'], // Plaza de Mayo
	[-34.6395, -58.3626, CABA, 'core'], // Caminito
	[-34.6106, -58.3639, CABA, 'core'], // Puerto Madero
	[-34.5875, -58.3928, CABA, 'core'], // Recoleta
	[-34.5885, -58.428, CABA, 'core'], // Palermo Soho
	[-34.5805, -58.4206, CABA, 'core'], // Plaza Italia
	[-34.562, -58.456, CABA, 'outer'], // Cabildo y Juramento
	[-34.5453, -58.4498, CABA, 'outer'], // Núñez
	[-34.573, -58.491, CABA, 'outer'], // Villa Urquiza
	[-34.618, -58.435, CABA, 'outer'], // Caballito
	[-34.629, -58.464, CABA, 'outer'], // Flores
	[-34.645, -58.523, CABA, 'outer'], // Liniers
	[-34.657, -58.505, CABA, 'outer'], // Mataderos
	[-34.599, -58.513, CABA, 'outer'], // Villa Devoto
	[-34.589, -58.456, CABA, 'outer'], // Chacarita
	[-34.608, -58.42, CABA, 'core'], // Almagro
	[-34.621, -58.373, CABA, 'core'], // San Telmo
	[-34.645, -58.38, CABA, 'outer'], // Barracas
	[-34.654, -58.418, CABA, 'outer'], // Nueva Pompeya
	// --- GBA (provincia de Buenos Aires) ---
	[-34.663, -58.365, BA, 'outer'], // Avellaneda
	[-34.72, -58.254, BA, 'outer'], // Quilmes
	[-34.703, -58.392, BA, 'outer'], // Lanús
	[-34.472, -58.508, BA, 'outer'], // San Isidro
	[-34.528, -58.479, BA, 'outer'], // Vicente López
	[-34.653, -58.619, BA, 'outer'], // Morón
	[-34.572, -58.535, BA, 'outer'], // San Martín
	[-34.4264, -58.5796, BA, 'outer'], // Tigre
	// --- Resto del país ---
	[-34.9215, -57.9545, BA, 'city'], // La Plata
	[-38.0055, -57.5426, BA, 'city'], // Mar del Plata
	[-38.7183, -62.2661, BA, 'city'], // Bahía Blanca
	[-37.3217, -59.1332, BA, 'city'], // Tandil
	[-32.9477, -60.6304, 'Santa Fe', 'city'], // Rosario
	[-31.6333, -60.7, 'Santa Fe', 'city'], // Santa Fe
	[-31.7319, -60.5238, 'Entre Ríos', 'city'], // Paraná
	[-32.4825, -58.2372, 'Entre Ríos', 'city'], // Gualeguaychú
	[-31.4201, -64.1888, 'Córdoba', 'city'], // Córdoba
	[-31.4241, -64.4978, 'Córdoba', 'town'], // Villa Carlos Paz
	[-33.1232, -64.3493, 'Córdoba', 'city'], // Río Cuarto
	[-32.8895, -68.8458, 'Mendoza', 'city'], // Mendoza
	[-34.6177, -68.3301, 'Mendoza', 'city'], // San Rafael
	[-31.5375, -68.5364, 'San Juan', 'city'], // San Juan
	[-33.295, -66.3356, 'San Luis', 'city'], // San Luis
	[-29.4111, -66.8507, 'La Rioja', 'city'], // La Rioja
	[-28.4696, -65.7795, 'Catamarca', 'city'], // Catamarca
	[-24.7859, -65.4117, 'Salta', 'city'], // Salta
	[-24.1858, -65.2995, 'Jujuy', 'city'], // San Salvador de Jujuy
	[-23.745, -65.5, 'Jujuy', 'town'], // Purmamarca
	[-26.8241, -65.2226, 'Tucumán', 'city'], // San Miguel de Tucumán
	[-27.7951, -64.2615, 'Santiago del Estero', 'city'], // Santiago del Estero
	[-27.4606, -58.9839, 'Chaco', 'city'], // Resistencia
	[-27.4692, -58.8306, 'Corrientes', 'city'], // Corrientes
	[-27.3671, -55.8961, 'Misiones', 'city'], // Posadas
	[-25.5995, -54.5735, 'Misiones', 'town'], // Puerto Iguazú
	[-26.1775, -58.1781, 'Formosa', 'city'], // Formosa
	[-36.6167, -64.2833, 'La Pampa', 'city'], // Santa Rosa
	[-38.9516, -68.0591, 'Neuquén', 'city'], // Neuquén
	[-41.1335, -71.3103, 'Río Negro', 'city'], // Bariloche
	[-40.7578, -71.6497, 'Neuquén', 'town'], // Villa La Angostura
	[-40.8135, -62.9967, 'Río Negro', 'city'], // Viedma
	[-42.912, -71.318, 'Chubut', 'town'], // Esquel
	[-43.2489, -65.3051, 'Chubut', 'city'], // Trelew
	[-42.7692, -65.0385, 'Chubut', 'city'], // Puerto Madryn
	[-43.3002, -65.1023, 'Chubut', 'town'], // Rawson
	[-45.8644, -67.4966, 'Santa Cruz', 'city'], // Comodoro (Chubut, pero pool chico)
	[-51.623, -69.2168, 'Santa Cruz', 'city'], // Río Gallegos
	[-50.3379, -72.2648, 'Santa Cruz', 'town'], // El Calafate
	[-54.8019, -68.303, 'Tierra del Fuego', 'city'] // Ushuaia
];

const PROVINCE_REGION: Record<string, string> = {
	[CABA]: 'ar-caba',
	[BA]: 'ar-ba',
	Catamarca: 'ar-ca',
	Chubut: 'ar-cb',
	Chaco: 'ar-ch',
	'Córdoba': 'ar-co',
	Corrientes: 'ar-cr',
	'Entre Ríos': 'ar-er',
	Formosa: 'ar-fo',
	Jujuy: 'ar-jy',
	'La Pampa': 'ar-lp',
	'La Rioja': 'ar-lr',
	Misiones: 'ar-mi',
	Mendoza: 'ar-mz',
	'Neuquén': 'ar-nq',
	'Río Negro': 'ar-rn',
	Salta: 'ar-sa',
	'Santa Cruz': 'ar-sc',
	'Santiago del Estero': 'ar-se',
	'Santa Fe': 'ar-sf',
	'San Juan': 'ar-sj',
	'San Luis': 'ar-sl',
	'Tierra del Fuego': 'ar-tf',
	'Tucumán': 'ar-tu'
};

type Row = [number, number, string | null, string, number, string, number, number, number, number | null];

function shard(entries: Array<[number, number, string, Cat]>) {
	const admin1 = [...new Set(entries.map((e) => e[2]))];
	const pcts = percentileRanks(entries.map((e) => DIFF[e[3]]));
	const rows: Row[] = entries.map((e, i) => [
		e[0],
		e[1],
		null,
		'ar',
		admin1.indexOf(e[2]),
		'2023-01',
		DIFF[e[3]],
		pcts[i],
		TAGS[e[3]],
		null
	]);
	return { version: 1, source: 'seed' as const, admin1, rows };
}

mkdirSync('static/data/pool', { recursive: true });

const shards: Record<string, Array<[number, number, string, Cat]>> = {
	ar: SEED,
	'ar-caba': SEED.filter(
		(e) => e[2] === CABA || (e[2] === BA && e[0] > -34.85 && e[0] < -34.4 && e[1] > -58.8 && e[1] < -58.15)
	)
};
for (const [province, regionId] of Object.entries(PROVINCE_REGION)) {
	if (regionId === 'ar-caba') continue;
	shards[regionId] ??= SEED.filter((e) => e[2] === province);
}

const manifest: Record<string, { count: number; shards: string[]; source: 'seed' }> = {};
for (const [regionId, entries] of Object.entries(shards)) {
	if (!entries.length) continue;
	writeFileSync(`static/data/pool/${regionId}.json`, JSON.stringify(shard(entries)) + '\n');
	manifest[regionId] = { count: entries.length, shards: [`${regionId}.json`], source: 'seed' };
}

writeFileSync(
	'static/data/pool/manifest.json',
	JSON.stringify({ version: 1, builtAt: new Date().toISOString(), regions: manifest }, null, '\t') + '\n'
);

const playable = Object.entries(manifest).filter(([, m]) => m.count >= 20);
console.log(`pool semilla: ${SEED.length} ubicaciones en ${Object.keys(manifest).length} shards`);
console.log(`jugables (>=20): ${playable.map(([id, m]) => `${id} (${m.count})`).join(', ')}`);
console.log('el resto queda por debajo del piso hasta que corras el baker');
