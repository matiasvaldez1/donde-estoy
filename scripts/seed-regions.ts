/**
 * Genera static/data/regions.json con diagonales calculadas.
 * Semilla provisoria: 05-emit.ts lo regenera con bboxes reales de Natural Earth.
 *
 *   pnpm tsx scripts/seed-regions.ts
 */
import { writeFileSync } from 'node:fs';
import { bboxDiagonalKm } from '../src/lib/utils.ts';
import type { BBox, Region, RegionKind } from '../src/lib/types.ts';

interface Def {
	id: string;
	name: string;
	kind: RegionKind;
	parentId: string | null;
	bbox: BBox;
	escalatesTo: string | null;
}

const PROVINCIAS: Array<[string, string, BBox]> = [
	['ar-ba', 'Buenos Aires', [-63.4, -41.05, -56.66, -33.26]],
	['ar-ca', 'Catamarca', [-69.05, -29.1, -64.9, -25.0]],
	['ar-cb', 'Chubut', [-71.9, -46.0, -63.5, -42.0]],
	['ar-ch', 'Chaco', [-63.4, -28.1, -58.3, -24.1]],
	['ar-co', 'Córdoba', [-65.8, -35.0, -61.8, -29.5]],
	['ar-cr', 'Corrientes', [-59.7, -30.7, -55.6, -27.3]],
	['ar-er', 'Entre Ríos', [-60.8, -34.0, -57.8, -30.2]],
	['ar-fo', 'Formosa', [-62.4, -26.9, -57.5, -22.0]],
	['ar-jy', 'Jujuy', [-67.2, -24.6, -64.1, -21.8]],
	['ar-lp', 'La Pampa', [-68.3, -39.0, -63.4, -35.0]],
	['ar-lr', 'La Rioja', [-69.6, -31.9, -65.5, -27.7]],
	['ar-mi', 'Misiones', [-56.1, -28.2, -53.6, -25.5]],
	['ar-mz', 'Mendoza', [-70.6, -37.6, -66.5, -31.9]],
	['ar-nq', 'Neuquén', [-71.9, -41.1, -68.0, -36.0]],
	['ar-rn', 'Río Negro', [-71.9, -42.0, -62.8, -37.6]],
	['ar-sa', 'Salta', [-68.6, -26.4, -62.3, -22.0]],
	['ar-sc', 'Santa Cruz', [-73.6, -52.4, -65.7, -46.0]],
	['ar-se', 'Santiago del Estero', [-65.6, -30.1, -61.7, -25.6]],
	['ar-sf', 'Santa Fe', [-63.0, -34.5, -58.8, -28.0]],
	['ar-sj', 'San Juan', [-70.6, -32.9, -66.7, -28.4]],
	['ar-sl', 'San Luis', [-67.4, -36.0, -64.9, -31.8]],
	['ar-tf', 'Tierra del Fuego', [-68.6, -55.1, -65.0, -52.6]],
	['ar-tu', 'Tucumán', [-66.2, -28.0, -64.5, -26.0]]
];

const DEFS: Def[] = [
	{ id: 'world', name: 'Mundo', kind: 'world', parentId: null, bbox: [-180, -60, 180, 75], escalatesTo: null },
	{ id: 'americas', name: 'América', kind: 'continent', parentId: 'world', bbox: [-168, -56, -34, 72], escalatesTo: 'world' },
	{ id: 'latam', name: 'Latinoamérica', kind: 'continent', parentId: 'americas', bbox: [-118.4, -56, -34.8, 32.7], escalatesTo: 'americas' },
	{ id: 'cono-sur', name: 'Cono Sur', kind: 'bloc', parentId: 'latam', bbox: [-75.7, -55.98, -53.1, -17.5], escalatesTo: 'latam' },
	{ id: 'andina', name: 'Región Andina', kind: 'bloc', parentId: 'latam', bbox: [-81.4, -22.9, -66.9, 12.5], escalatesTo: 'latam' },
	{ id: 'mex-centroamerica', name: 'México y Centroamérica', kind: 'bloc', parentId: 'latam', bbox: [-118.4, 7.2, -77.2, 32.7], escalatesTo: 'latam' },
	{ id: 'ar', name: 'Argentina', kind: 'country', parentId: 'cono-sur', bbox: [-73.6, -55.1, -53.6, -21.8], escalatesTo: 'cono-sur' },
	{ id: 'cl', name: 'Chile', kind: 'country', parentId: 'cono-sur', bbox: [-75.7, -55.98, -66.4, -17.5], escalatesTo: 'cono-sur' },
	{ id: 'uy', name: 'Uruguay', kind: 'country', parentId: 'cono-sur', bbox: [-58.5, -35.0, -53.1, -30.1], escalatesTo: 'cono-sur' },
	{ id: 'py', name: 'Paraguay', kind: 'country', parentId: 'cono-sur', bbox: [-62.7, -27.6, -54.2, -19.3], escalatesTo: 'cono-sur' },
	{ id: 'bo', name: 'Bolivia', kind: 'country', parentId: 'andina', bbox: [-69.7, -22.9, -57.5, -9.7], escalatesTo: 'andina' },
	{ id: 'pe', name: 'Perú', kind: 'country', parentId: 'andina', bbox: [-81.4, -18.4, -68.7, -0.03], escalatesTo: 'andina' },
	{ id: 'co', name: 'Colombia', kind: 'country', parentId: 'andina', bbox: [-79.0, -4.2, -66.9, 12.5], escalatesTo: 'andina' },
	{ id: 'br', name: 'Brasil', kind: 'country', parentId: 'latam', bbox: [-74.0, -33.8, -34.8, 5.3], escalatesTo: 'latam' },
	{ id: 'mx', name: 'México', kind: 'country', parentId: 'mex-centroamerica', bbox: [-118.4, 14.5, -86.7, 32.7], escalatesTo: 'mex-centroamerica' },
	{ id: 'ar-caba', name: 'CABA y GBA', kind: 'city', parentId: 'ar-ba', bbox: [-58.8, -34.85, -58.15, -34.4], escalatesTo: 'ar-ba' },
	...PROVINCIAS.map(([id, name, bbox]): Def => ({
		id,
		name,
		kind: 'admin1',
		parentId: 'ar',
		bbox,
		escalatesTo: 'ar'
	}))
];

const byId = new Map(DEFS.map((d) => [d.id, d]));

const WORLD_DIAGONAL_KM = Math.round(bboxDiagonalKm(byId.get('world')!.bbox));

const regions: Record<string, Region> = {};
for (const def of DEFS) {
	regions[def.id] = {
		id: def.id,
		name: def.name,
		kind: def.kind,
		parentId: def.parentId,
		childIds: DEFS.filter((d) => d.parentId === def.id).map((d) => d.id),
		shards: def.kind === 'bloc' || def.kind === 'continent' || def.kind === 'world'
			? [`_mix/${def.id}.json`]
			: [`${def.id}.json`],
		bbox: def.bbox,
		center: [(def.bbox[1] + def.bbox[3]) / 2, (def.bbox[0] + def.bbox[2]) / 2],
		// Ningun recorte puede ser mas indulgente que el mundo entero: la bbox
		// del mundo es degenerada en el antimeridiano y da ~15.000 km.
		diagonalKm: Math.min(Math.round(bboxDiagonalKm(def.bbox)), WORLD_DIAGONAL_KM),
		locationCount: 0,
		escalatesTo: def.escalatesTo
	};
}

for (const def of DEFS) {
	if (def.escalatesTo && !byId.has(def.escalatesTo)) {
		throw new Error(`${def.id} escala a una region inexistente: ${def.escalatesTo}`);
	}
}

const out = { version: 1, generatedAt: new Date().toISOString(), regions };
writeFileSync('static/data/regions.json', JSON.stringify(out, null, '\t') + '\n');
console.log(`regions.json: ${DEFS.length} regiones`);
for (const id of ['ar-caba', 'ar-ba', 'ar', 'cono-sur', 'latam', 'americas', 'world']) {
	console.log(`  ${id.padEnd(12)} diagonal ${regions[id].diagonalKm} km`);
}
