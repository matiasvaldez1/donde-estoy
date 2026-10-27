import { MAX_ROUND_SCORE, roundScore, scorePin, scoreTile } from '../src/lib/game/scoring';
import { AR, location, WORLD } from './helpers';

describe('roundScore', () => {
	it('da el maximo al clavarla', () => {
		expect(roundScore(0, 4000)).toBe(MAX_ROUND_SCORE);
	});

	it('cae segun exp(-10 d / diagonal)', () => {
		// A una decima parte de la diagonal el puntaje es 5000 * e^-1.
		expect(roundScore(400, 4000)).toBe(1839);
	});

	it('normaliza por region: el mismo error relativo da el mismo puntaje', () => {
		const enCaba = roundScore(0.78, 78);
		const enElMundo = roundScore(150.11, 15011);
		expect(Math.abs(enCaba - enElMundo)).toBeLessThanOrEqual(1);
	});

	it('es monotono decreciente', () => {
		expect(roundScore(10, 4000)).toBeGreaterThan(roundScore(100, 4000));
		expect(roundScore(100, 4000)).toBeGreaterThan(roundScore(1000, 4000));
	});

	it('no explota con diagonal cero', () => {
		expect(roundScore(10, 0)).toBe(0);
	});
});

describe('scorePin', () => {
	it('sin respuesta es cero y sin distancia', () => {
		expect(scorePin(null, location(), AR)).toEqual({ score: 0, distanceKm: null });
	});

	it('clavar la coordenada da el maximo', () => {
		const loc = location();
		const res = scorePin({ lat: loc.lat, lng: loc.lng, elapsedSec: 3, timedOut: false }, loc, AR);
		expect(res.score).toBe(MAX_ROUND_SCORE);
		expect(res.distanceKm).toBeCloseTo(0, 6);
	});

	it('errar de hemisferio no da nada ni en el mundo', () => {
		const res = scorePin({ lat: 55, lng: 37, elapsedSec: 3, timedOut: false }, location(), WORLD);
		expect(res.score).toBeLessThan(10);
	});
});

describe('scoreTile', () => {
	it('mapea cada tramo a su cuadrado', () => {
		expect(scoreTile(5000, true)).toBe('🟩');
		expect(scoreTile(3200, true)).toBe('🟨');
		expect(scoreTile(2000, true)).toBe('🟧');
		expect(scoreTile(100, true)).toBe('⬛');
		expect(scoreTile(0, false)).toBe('⬜');
	});
});
