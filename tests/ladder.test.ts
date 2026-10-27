import {
	MAX_TIER,
	nextTierOnFail,
	nextTierOnPass,
	resolveConstraints,
	tierForStreak,
	TIERS,
	widenRegion
} from '../src/lib/game/ladder';
import { initialState } from '../src/lib/game/engine';
import { clasica } from '../src/lib/game/modes/clasica';
import { escalera } from '../src/lib/game/modes/escalera';
import { REGIONS } from './helpers';

describe('tierForStreak', () => {
	it('arranca en el escalon cero', () => {
		expect(tierForStreak(0)).toBe(0);
		expect(tierForStreak(1)).toBe(0);
	});

	it('sube en cada umbral de la tabla', () => {
		for (let i = 0; i < TIERS.length; i++) {
			expect(tierForStreak(TIERS[i].minStreak)).toBe(i);
		}
	});

	it('se planta en el ultimo escalon', () => {
		expect(tierForStreak(999)).toBe(MAX_TIER);
	});
});

describe('movimiento entre escalones', () => {
	it('acertar nunca baja de escalon', () => {
		expect(nextTierOnPass(3, 7)).toBe(3);
		expect(nextTierOnPass(0, 4)).toBe(2);
	});

	it('errar baja dos escalones, no hasta el fondo', () => {
		expect(nextTierOnFail(4)).toBe(2);
		expect(nextTierOnFail(3)).toBe(1);
	});

	it('errar abajo de todo no pasa a negativo', () => {
		expect(nextTierOnFail(1)).toBe(0);
		expect(nextTierOnFail(0)).toBe(0);
	});

	it('despues de caer, la racha vuelve a empujar desde ese escalon', () => {
		const caido = nextTierOnFail(4);
		expect(nextTierOnPass(caido, 1)).toBe(2);
		expect(nextTierOnPass(caido, 9)).toBe(4);
	});
});

describe('widenRegion', () => {
	it('camina la cadena de ampliacion', () => {
		expect(widenRegion('ar', 0, REGIONS)).toBe('ar');
		expect(widenRegion('ar', 1, REGIONS)).toBe('cono-sur');
		expect(widenRegion('ar', 2, REGIONS)).toBe('latam');
		expect(widenRegion('ar', 3, REGIONS)).toBe('world');
	});

	it('se queda en el mundo cuando se acaba la cadena', () => {
		expect(widenRegion('ar', 99, REGIONS)).toBe('world');
	});

	it('saltea regiones sin pool en vez de romperse', () => {
		const soloAr = (id: string) => id === 'ar';
		expect(widenRegion('ar', 3, REGIONS, soloAr)).toBe('ar');
		const sinConoSur = (id: string) => id !== 'cono-sur';
		expect(widenRegion('ar', 2, REGIONS, sinConoSur)).toBe('latam');
	});
});

describe('resolveConstraints', () => {
	it('el modo sin escalera juega siempre suelto en la region elegida', () => {
		const state = initialState(clasica, 'ar');
		const c = resolveConstraints(clasica, { ...state, tier: 4 }, REGIONS);
		expect(c.regionId).toBe('ar');
		expect(c.timeLimitSec).toBeNull();
		expect(c.allowMove).toBe(true);
		expect(c.difficultyPct).toEqual([0, 100]);
	});

	it('la escalera aprieta y ensancha a la vez', () => {
		const state = initialState(escalera, 'ar');
		const t0 = resolveConstraints(escalera, state, REGIONS);
		expect(t0.regionId).toBe('ar');
		expect(t0.allowMove).toBe(true);

		const t3 = resolveConstraints(escalera, { ...state, tier: 3 }, REGIONS);
		expect(t3.regionId).toBe('cono-sur');
		expect(t3.allowMove).toBe(false);
		expect(t3.allowPan).toBe(false);
		expect(t3.timeLimitSec).toBe(45);

		const t5 = resolveConstraints(escalera, { ...state, tier: 5 }, REGIONS);
		expect(t5.regionId).toBe('world');
		expect(t5.showCompass).toBe(false);
		expect(t5.difficultyPct[0]).toBeGreaterThanOrEqual(70);
	});

	it('el escalon mas alto nunca se pasa del final de la tabla', () => {
		const state = initialState(escalera, 'ar');
		const c = resolveConstraints(escalera, { ...state, tier: 99 }, REGIONS);
		expect(c.timeLimitSec).toBe(TIERS[MAX_TIER].timeLimitSec);
	});
});
