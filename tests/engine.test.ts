import { initialState, lastResult, reduce } from '../src/lib/game/engine';
import type { EngineAction, EngineCtx } from '../src/lib/game/engine';
import { resolveConstraints } from '../src/lib/game/ladder';
import { clasica } from '../src/lib/game/modes/clasica';
import { escalera } from '../src/lib/game/modes/escalera';
import type { GameState, ModeDef } from '../src/lib/types';
import { AR, location, REGIONS } from './helpers';

function ctxFor(mode: ModeDef): EngineCtx {
	return { mode, regions: REGIONS };
}

function start(state: GameState, mode: ModeDef, now = 0, loc = location()): GameState {
	return reduce(
		state,
		{ type: 'START_ROUND', location: loc, constraints: resolveConstraints(mode, state, REGIONS), now },
		ctxFor(mode)
	);
}

function guessExactly(state: GameState, mode: ModeDef, elapsedSec = 5): GameState {
	const loc = state.current!.location;
	return reduce(
		state,
		{ type: 'SUBMIT_GUESS', guess: { lat: loc.lat, lng: loc.lng, elapsedSec, timedOut: false }, now: elapsedSec * 1000 },
		ctxFor(mode)
	);
}

function guessFarAway(state: GameState, mode: ModeDef): GameState {
	return reduce(
		state,
		{ type: 'SUBMIT_GUESS', guess: { lat: 60, lng: 20, elapsedSec: 5, timedOut: false }, now: 5000 },
		ctxFor(mode)
	);
}

describe('ciclo de una ronda', () => {
	it('arranca inactivo y pasa a jugando', () => {
		let s = initialState(clasica, 'ar');
		expect(s.status).toBe('idle');
		s = start(s, clasica);
		expect(s.status).toBe('playing');
		expect(s.current?.constraints.regionId).toBe('ar');
	});

	it('clavarla da 5000 y suma a la racha', () => {
		let s = start(initialState(clasica, 'ar'), clasica);
		s = guessExactly(s, clasica);
		expect(s.status).toBe('result');
		expect(s.totalScore).toBe(5000);
		expect(s.streak).toBe(1);
		expect(lastResult(s)?.passed).toBe(true);
		expect(lastResult(s)?.distanceKm).toBeCloseTo(0, 6);
	});

	it('el timeout cuenta como ronda perdida sin respuesta', () => {
		let s = start(initialState(clasica, 'ar'), clasica, 0);
		s = reduce(s, { type: 'TIMEOUT', now: 120_000 }, ctxFor(clasica));
		const res = lastResult(s)!;
		expect(res.score).toBe(0);
		expect(res.passed).toBe(false);
		expect(res.guess?.timedOut).toBe(true);
		expect(res.distanceKm).toBeNull();
		expect(s.streak).toBe(0);
	});

	it('ignora respuestas cuando no se esta jugando', () => {
		const s = initialState(clasica, 'ar');
		const after = guessFarAway(s, clasica);
		expect(after).toBe(s);
	});

	it('no acepta dos respuestas para la misma ronda', () => {
		let s = start(initialState(clasica, 'ar'), clasica);
		s = guessExactly(s, clasica);
		const dup = guessExactly(s, clasica);
		expect(dup.results.length).toBe(1);
	});
});

describe('partida clasica completa', () => {
	it('se termina sola a las 5 rondas', () => {
		let s = initialState(clasica, 'ar');
		for (let i = 0; i < 5; i++) {
			s = start(s, clasica);
			s = guessExactly(s, clasica);
			if (i < 4) s = reduce(s, { type: 'NEXT_ROUND' }, ctxFor(clasica));
		}
		expect(s.results.length).toBe(5);
		expect(s.status).toBe('over');
		expect(s.totalScore).toBe(25_000);
	});

	it('NEXT_ROUND despues del final no hace nada', () => {
		let s = initialState(clasica, 'ar');
		for (let i = 0; i < 5; i++) {
			s = start(s, clasica);
			s = guessExactly(s, clasica);
			if (i < 4) s = reduce(s, { type: 'NEXT_ROUND' }, ctxFor(clasica));
		}
		const after = reduce(s, { type: 'NEXT_ROUND' }, ctxFor(clasica));
		expect(after.status).toBe('over');
		expect(after.roundIndex).toBe(s.roundIndex);
	});
});

describe('escalera', () => {
	it('sube de escalon con la racha y ensancha la region', () => {
		let s = initialState(escalera, 'ar');
		for (let i = 0; i < 4; i++) {
			s = start(s, escalera);
			s = guessExactly(s, escalera);
			s = reduce(s, { type: 'NEXT_ROUND' }, ctxFor(escalera));
		}
		expect(s.streak).toBe(4);
		expect(s.tier).toBe(2);
		expect(resolveConstraints(escalera, s, REGIONS).regionId).toBe('cono-sur');
	});

	it('cortar la racha baja dos escalones pero no borra la sesion', () => {
		let s = initialState(escalera, 'ar');
		for (let i = 0; i < 6; i++) {
			s = start(s, escalera);
			s = guessExactly(s, escalera);
			s = reduce(s, { type: 'NEXT_ROUND' }, ctxFor(escalera));
		}
		expect(s.tier).toBe(3);
		s = start(s, escalera);
		s = guessFarAway(s, escalera);
		expect(s.streak).toBe(0);
		expect(s.tier).toBe(1);
		expect(s.bestStreak).toBe(6);
		expect(s.status).toBe('result');
	});

	it('no se termina sola', () => {
		let s = initialState(escalera, 'ar');
		s = start(s, escalera);
		s = guessFarAway(s, escalera);
		expect(s.status).toBe('result');
		expect(reduce(s, { type: 'NEXT_ROUND' }, ctxFor(escalera)).status).toBe('idle');
	});

	it('END corta la partida en cualquier momento', () => {
		let s = start(initialState(escalera, 'ar'), escalera);
		s = reduce(s, { type: 'END' }, ctxFor(escalera));
		expect(s.status).toBe('over');
		expect(s.current).toBeNull();
	});
});

describe('region desconocida', () => {
	it('no revienta si la ronda apunta a una region que no existe', () => {
		let s = initialState(clasica, 'ar');
		s = reduce(
			s,
			{
				type: 'START_ROUND',
				location: location(),
				constraints: { ...resolveConstraints(clasica, s, REGIONS), regionId: 'no-existe' },
				now: 0
			},
			ctxFor(clasica)
		);
		const after = guessExactly(s, clasica);
		expect(after.results.length).toBe(0);
		expect(AR.diagonalKm).toBeGreaterThan(0);
	});
});
