import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { haversineKm } from '../../../src/lib/utils.ts';

/** GeoNames cities1000: todo asentamiento de 1.000 habitantes para arriba. */
export interface City {
	name: string;
	lat: number;
	lng: number;
	population: number;
	cc: string;
}

export function loadCities(dir: string): City[] {
	const txt = `${dir}/cities1000.txt`;
	if (!existsSync(txt)) {
		const zip = `${dir}/cities1000.zip`;
		if (!existsSync(zip)) throw new Error('Falta cities1000: corré el paso 01-sources');
		execFileSync('unzip', ['-o', '-q', zip, '-d', dir]);
	}
	return readFileSync(txt, 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((line) => {
			const f = line.split('\t');
			return {
				name: f[1],
				lat: Number(f[4]),
				lng: Number(f[5]),
				cc: (f[8] ?? '').toLowerCase(),
				population: Number(f[14]) || 0
			};
		})
		.filter((c) => Number.isFinite(c.lat) && Number.isFinite(c.lng));
}

/**
 * Indice por celda de un grado: con 150.000 ciudades, recorrer la lista entera
 * por cada ubicacion convierte el horneado en una tarde perdida.
 */
export class CityIndex {
	private cells = new Map<string, City[]>();

	constructor(cities: City[]) {
		for (const city of cities) {
			const key = `${Math.floor(city.lat)}:${Math.floor(city.lng)}`;
			const list = this.cells.get(key);
			if (list) list.push(city);
			else this.cells.set(key, [city]);
		}
	}

	/** Distancia en km a la ciudad mas cercana con al menos `minPopulation`. */
	nearestKm(lat: number, lng: number, minPopulation: number, maxRings = 12): number {
		const baseLat = Math.floor(lat);
		const baseLng = Math.floor(lng);
		let best = Infinity;
		for (let ring = 0; ring <= maxRings; ring++) {
			for (let dLat = -ring; dLat <= ring; dLat++) {
				for (let dLng = -ring; dLng <= ring; dLng++) {
					if (ring > 0 && Math.abs(dLat) !== ring && Math.abs(dLng) !== ring) continue;
					for (const city of this.cells.get(`${baseLat + dLat}:${baseLng + dLng}`) ?? []) {
						if (city.population < minPopulation) continue;
						const d = haversineKm(lat, lng, city.lat, city.lng);
						if (d < best) best = d;
					}
				}
			}
			// Un anillo completo ya cubre mas distancia que el mejor candidato.
			if (best < ring * 100) return best;
		}
		return best === Infinity ? maxRings * 111 : best;
	}
}
