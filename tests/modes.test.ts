import { initialState, lastResult, reduce } from '../src/lib/game/engine';
import type { EngineCtx } from '../src/lib/game/engine';
import { resolveConstraints } from '../src/lib/game/ladder';
import { contrarreloj, TOTAL_CLOCK_SEC } from '../src/lib/game/modes/contrarreloj';
import { muerteSubita } from '../src/lib/game/modes/muerte-subita';
import { racha } from '../src/lib/game/modes/racha';
import { dailyNumber, dailyScopeId, DAILY_SCOPES } from '../src/lib/game/modes/diario';
import { getMode, MODE_LIST, MODES } from '../src/lib/game/modes';
import type { GameState, ModeDef } from '../src/lib/types';
import { location, REGIONS } from './helpers';

function startRound(state: GameState, mode: ModeDef, loc = location()): GameState {
	const ctx: EngineCtx = { mode, regions: REGIONS };
	return reduce(
		state,
		{ type: 'START_ROUND', location: loc, constraints: resolveConstraints(mode, state, REGIONS), now: 0 },
		ctx
	);
}

describe('registro de modos', () => {
	it('expone los seis modos con id unico', () => {
		expect(MODE_LIST.length).toBe(6);
		expect(new Set(MODE_LIST.map((m) => m.id)).size).toBe(6);
	});

	it('getMode resuelve por id y rechaza lo que no existe', () => {
		expect(getMode('escalera')?.name).toBe('Escalera');
		expect(getMode('no-existe')).toBeNull();
	});

	it('cada clave del registro coincide con el id del modo', () => {
		for (const [id, mode] of Object.entries(MODES)) expect(mode.id).toBe(id);
	});
});

describe('racha', () => {
	const ctx: EngineCtx = { mode: racha, regions: REGIONS };

	it('acertar el pais da el maximo', () => {
		let s = startRound(initialState(racha, 'ar'), racha);
		s = reduce(s, { type: 'SUBMIT_GUESS', guess: { cc: 'ar', elapsedSec: 4, timedOut: false }, now: 4000 }, ctx);
		expect(lastResult(s)?.passed).toBe(true);
		expect(lastResult(s)?.score).toBe(5000);
		expect(s.status).toBe('result');
	});

	it('un solo error termina la corrida', () => {
		let s = startRound(initialState(racha, 'ar'), racha);
		s = reduce(s, { type: 'SUBMIT_GUESS', guess: { cc: 'cl', elapsedSec: 4, timedOut: false }, now: 4000 }, ctx);
		expect(lastResult(s)?.passed).toBe(false);
		expect(s.status).toBe('over');
	});

	it('dentro de Argentina pregunta la provincia', () => {
		expect(racha.guessKindFor?.(REGIONS.ar)).toBe('country');
		expect(racha.guessKindFor?.({ ...REGIONS.ar, id: 'ar-mz', kind: 'admin1' })).toBe('admin1');
		expect(racha.guessKindFor?.({ ...REGIONS.ar, id: 'cl-ta', kind: 'admin1' })).toBe('country');
	});

	it('compara provincia cuando la respuesta la trae', () => {
		const loc = location({ admin1: 'Mendoza' });
		let s = startRound(initialState(racha, 'ar-mz'), racha, loc);
		s = reduce(s, { type: 'SUBMIT_GUESS', guess: { admin1: 'Mendoza', elapsedSec: 2, timedOut: false }, now: 2000 }, ctx);
		expect(lastResult(s)?.passed).toBe(true);
	});
});

describe('muerte subita', () => {
	const ctx: EngineCtx = { mode: muerteSubita, regions: REGIONS };

	it('arranca con un cuarto de la diagonal de la region', () => {
		const s = startRound(initialState(muerteSubita, 'ar'), muerteSubita);
		expect(s.thresholdKm).toBeCloseTo(REGIONS.ar.diagonalKm * 0.25, 6);
		expect(s.current?.constraints.thresholdKm).toBe(s.thresholdKm);
	});

	it('el margen se encoge con cada acierto', () => {
		let s = startRound(initialState(muerteSubita, 'ar'), muerteSubita);
		const inicial = s.thresholdKm!;
		const loc = s.current!.location;
		s = reduce(s, { type: 'SUBMIT_GUESS', guess: { lat: loc.lat, lng: loc.lng, elapsedSec: 3, timedOut: false }, now: 3000 }, ctx);
		expect(s.thresholdKm).toBeCloseTo(inicial * 0.75, 6);
		expect(s.status).toBe('result');
	});

	it('pasarse del margen termina la partida aunque el puntaje no sea cero', () => {
		let s = startRound(initialState(muerteSubita, 'ar'), muerteSubita);
		const loc = s.current!.location;
		// ~1300 km al norte: puntaje mayor a cero, pero fuera del margen de 1015 km.
		s = reduce(s, { type: 'SUBMIT_GUESS', guess: { lat: loc.lat + 11.7, lng: loc.lng, elapsedSec: 3, timedOut: false }, now: 3000 }, ctx);
		expect(lastResult(s)!.score).toBeGreaterThan(0);
		expect(lastResult(s)!.passed).toBe(false);
		expect(s.status).toBe('over');
	});
});

describe('contrarreloj', () => {
	const ctx: EngineCtx = { mode: contrarreloj, regions: REGIONS };

	it('arranca con el reloj global cargado', () => {
		expect(initialState(contrarreloj, 'ar').clockLeftSec).toBe(TOTAL_CLOCK_SEC);
	});

	it('descuenta lo que tardaste y premia la velocidad', () => {
		let s = startRound(initialState(contrarreloj, 'ar'), contrarreloj);
		const loc = s.current!.location;
		s = reduce(s, { type: 'SUBMIT_GUESS', guess: { lat: loc.lat, lng: loc.lng, elapsedSec: 10, timedOut: false }, now: 10_000 }, ctx);
		expect(s.clockLeftSec).toBe(TOTAL_CLOCK_SEC - 10);
		// 5000 de la ronda mas el bonus por los 290 s que sobraban.
		expect(lastResult(s)!.score).toBe(5000 + 580);
	});

	it('se termina cuando se agota el reloj', () => {
		let s = startRound(initialState(contrarreloj, 'ar'), contrarreloj);
		const loc = s.current!.location;
		s = reduce(s, { type: 'SUBMIT_GUESS', guess: { lat: loc.lat, lng: loc.lng, elapsedSec: TOTAL_CLOCK_SEC, timedOut: false }, now: 1000 }, ctx);
		expect(s.clockLeftSec).toBe(0);
		expect(s.status).toBe('over');
	});

	it('errar no suma bonus', () => {
		let s = startRound(initialState(contrarreloj, 'ar'), contrarreloj);
		s = reduce(s, { type: 'TIMEOUT', now: 20_000 }, ctx);
		expect(lastResult(s)!.score).toBe(0);
	});
});

describe('desafio diario', () => {
	it('el alcance depende del dia de la semana y es estable', () => {
		expect(dailyScopeId('2026-10-27')).toBe(dailyScopeId('2026-10-27'));
		expect(DAILY_SCOPES).toContain(dailyScopeId('2026-10-27'));
		// 2026-10-26 fue lunes.
		expect(dailyScopeId('2026-10-26')).toBe('ar');
	});

	it('el numero de desafio avanza de uno en uno', () => {
		expect(dailyNumber('2024-01-01')).toBe(1);
		expect(dailyNumber('2024-01-02')).toBe(2);
		expect(dailyNumber('2026-10-27') - dailyNumber('2026-10-26')).toBe(1);
	});
});
