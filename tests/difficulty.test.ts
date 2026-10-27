import { COUNTRY_AMBIGUITY, difficultyScore, percentileRanks } from '../src/lib/game/difficulty';
import type { DifficultyInput } from '../src/lib/game/difficulty';

const urbano: DifficultyInput = {
	distToCity50kKm: 0.5,
	distToCity1kKm: 0.2,
	roadClass: 'residential',
	roadDensity: 12,
	captureYear: 2023,
	cc: 'ar'
};

const perdido: DifficultyInput = {
	distToCity50kKm: 320,
	distToCity1kKm: 85,
	roadClass: 'track',
	surface: 'gravel',
	roadDensity: 0.2,
	captureYear: 2011,
	cc: 'ar'
};

describe('difficultyScore', () => {
	it('se queda en 0-100', () => {
		expect(difficultyScore(urbano)).toBeGreaterThanOrEqual(0);
		expect(difficultyScore(perdido)).toBeLessThanOrEqual(100);
	});

	it('la ruta perdida es mas dificil que la calle de barrio', () => {
		expect(difficultyScore(perdido)).toBeGreaterThan(difficultyScore(urbano) + 40);
	});

	it('alejarse de las ciudades nunca baja la dificultad', () => {
		let previo = -1;
		for (const km of [0, 1, 10, 50, 200, 500]) {
			const score = difficultyScore({ ...urbano, distToCity50kKm: km });
			expect(score).toBeGreaterThanOrEqual(previo);
			previo = score;
		}
	});

	it('el camino de tierra suma sobre el asfaltado', () => {
		const asfalto = difficultyScore({ ...perdido, surface: 'asphalt' });
		expect(difficultyScore(perdido)).toBeGreaterThan(asfalto);
	});

	it('la imagen vieja suma, y topea a los 8 puntos', () => {
		const vieja = difficultyScore({ ...urbano, captureYear: 2009 });
		const vieja2 = difficultyScore({ ...urbano, captureYear: 2000 });
		expect(vieja).toBeGreaterThan(difficultyScore(urbano));
		expect(vieja2).toBe(vieja);
	});

	it('usa un valor por defecto para paises sin tabla', () => {
		const sinTabla = difficultyScore({ ...urbano, cc: 'zz' });
		expect(sinTabla).toBeGreaterThan(0);
		expect(COUNTRY_AMBIGUITY.zz).toBeUndefined();
	});

	it('Uruguay confunde mas que Mexico', () => {
		expect(difficultyScore({ ...urbano, cc: 'uy' })).toBeGreaterThan(
			difficultyScore({ ...urbano, cc: 'mx' })
		);
	});
});

describe('percentileRanks', () => {
	it('con un solo valor devuelve el medio', () => {
		expect(percentileRanks([42])).toEqual([50]);
	});

	it('con lista vacia no se queja', () => {
		expect(percentileRanks([])).toEqual([]);
	});

	it('ordena de menor a mayor', () => {
		const pcts = percentileRanks([10, 20, 30, 40]);
		expect(pcts[0]).toBeLessThan(pcts[3]);
		expect(pcts.every((p) => p >= 0 && p <= 100)).toBe(true);
	});

	it('los empates comparten percentil', () => {
		const pcts = percentileRanks([5, 5, 5, 5]);
		expect(new Set(pcts).size).toBe(1);
	});
});
