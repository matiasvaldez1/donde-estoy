import { clamp } from '../utils';

/**
 * Modelo de dificultad 0-100. Una sola implementacion, importada tanto por el
 * baker (scripts/bake/04-score.ts) como por el cliente.
 *
 * Limite honesto: sin mirar los pixeles no sabemos si el panorama tiene texto
 * legible. Esto es un proxy de terreno y poblamiento, no de densidad de pistas.
 */
export interface DifficultyInput {
	/** Distancia a la ciudad mas cercana de 50k+ habitantes, en km. */
	distToCity50kKm: number;
	/** Distancia al asentamiento mas cercano de 1k+ habitantes, en km. */
	distToCity1kKm: number;
	/** Tag highway de OSM de la via muestreada. */
	roadClass: string;
	/** Tag surface de OSM, si existe. */
	surface?: string;
	/** Km de via por km2 en el entorno inmediato. */
	roadDensity: number;
	/** Anio de captura de la imagen. */
	captureYear: number;
	cc: string;
}

/** Cuanto se confunde un pais con sus vecinos. 0 = inconfundible. */
export const COUNTRY_AMBIGUITY: Record<string, number> = {
	uy: 9,
	py: 8,
	ar: 7,
	co: 6,
	ec: 6,
	pa: 6,
	do: 6,
	bo: 5,
	pe: 5,
	gt: 5,
	cr: 5,
	sv: 5,
	hn: 5,
	br: 4,
	cl: 4,
	mx: 3,
	us: 2,
	ca: 2
};

/** Aporte de dificultad por tipo de via: la calle de barrio es la mas facil. */
const ROAD_CLASS_POINTS: Record<string, number> = {
	residential: 0,
	living_street: 0,
	pedestrian: 1,
	service: 2,
	tertiary: 4,
	secondary: 5,
	primary: 6,
	trunk: 9,
	motorway: 10,
	unclassified: 14,
	track: 18
};

const UNPAVED = new Set(['unpaved', 'gravel', 'dirt', 'ground', 'sand', 'compacted', 'earth']);

/** Escala logaritmica: 0 km da 0 puntos, `atKm` o mas da `maxPoints`. */
function logPoints(km: number, atKm: number, maxPoints: number): number {
	const d = Math.max(0, km);
	return clamp((Math.log10(1 + d) / Math.log10(1 + atKm)) * maxPoints, 0, maxPoints);
}

export function difficultyScore(input: DifficultyInput): number {
	let score = 0;

	// Lejos de todo es mas dificil: sin carteles, sin comercios, sin patentes.
	score += logPoints(input.distToCity50kKm, 200, 30);
	score += logPoints(input.distToCity1kKm, 50, 20);

	score += ROAD_CLASS_POINTS[input.roadClass] ?? 8;
	if (input.surface && UNPAVED.has(input.surface)) score += 6;

	// Mucha calle alrededor = zona urbana = mas pistas.
	score += clamp(12 - input.roadDensity * 1.2, 0, 12);

	// Camaras viejas: menos resolucion, menos carteles legibles.
	score += clamp((2020 - input.captureYear) * 0.9, 0, 8);

	score += COUNTRY_AMBIGUITY[input.cc.toLowerCase()] ?? 5;

	return Math.round(clamp(score, 0, 100));
}

/**
 * Percentil de cada valor dentro de su propio conjunto. Se guarda por region
 * porque "dificil para CABA" no se parece a "dificil para Santa Cruz".
 */
export function percentileRanks(values: readonly number[]): number[] {
	if (values.length === 0) return [];
	if (values.length === 1) return [50];
	const sorted = values.slice().sort((a, b) => a - b);
	return values.map((v) => {
		let below = 0;
		let equal = 0;
		for (const s of sorted) {
			if (s < v) below++;
			else if (s === v) equal++;
		}
		return Math.round(((below + equal / 2) / sorted.length) * 100);
	});
}
