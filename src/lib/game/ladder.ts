import type { GameState, ModeDef, Region, RoundConstraints } from '../types';

export interface Tier {
	minStreak: number;
	timeLimitSec: number | null;
	allowPan: boolean;
	allowZoom: boolean;
	allowMove: boolean;
	showCompass: boolean;
	/** Ventana de percentil de dificultad. */
	pct: [number, number];
	/** Cuantos pasos se amplia la region desde la elegida. */
	widen: number;
}

/** La unica tabla que hay que tocar para recalibrar la escalera. */
export const TIERS: Tier[] = [
	{ minStreak: 0, timeLimitSec: 120, allowPan: true, allowZoom: true, allowMove: true, showCompass: true, pct: [0, 35], widen: 0 },
	{ minStreak: 2, timeLimitSec: 90, allowPan: true, allowZoom: true, allowMove: false, showCompass: true, pct: [10, 50], widen: 0 },
	{ minStreak: 4, timeLimitSec: 60, allowPan: true, allowZoom: false, allowMove: false, showCompass: true, pct: [25, 65], widen: 1 },
	{ minStreak: 6, timeLimitSec: 45, allowPan: false, allowZoom: false, allowMove: false, showCompass: true, pct: [40, 80], widen: 1 },
	{ minStreak: 9, timeLimitSec: 30, allowPan: false, allowZoom: false, allowMove: false, showCompass: false, pct: [55, 95], widen: 2 },
	{ minStreak: 13, timeLimitSec: 20, allowPan: false, allowZoom: false, allowMove: false, showCompass: false, pct: [70, 100], widen: 3 }
];

export const MAX_TIER = TIERS.length - 1;

/** Cuantos escalones se baja al cortar la racha: uno malo no borra la sesion. */
export const TIER_DROP_ON_FAIL = 2;

export function tierForStreak(streak: number): number {
	let tier = 0;
	for (let i = 0; i < TIERS.length; i++) {
		if (streak >= TIERS[i].minStreak) tier = i;
	}
	return tier;
}

export function nextTierOnPass(tier: number, streak: number): number {
	return Math.min(MAX_TIER, Math.max(tier, tierForStreak(streak)));
}

export function nextTierOnFail(tier: number): number {
	return Math.max(0, tier - TIER_DROP_ON_FAIL);
}

/**
 * Camina la cadena `escalatesTo` tantos pasos como pida el escalon. Si se llega
 * al final de la cadena (mundo), se queda ahi.
 *
 * `isPlayable` deja saltear regiones sin pool: mientras no horneaste el resto
 * del continente, la escalera se queda en el recorte mas ancho que si tiene
 * ubicaciones en vez de romperse.
 */
export function widenRegion(
	regionId: string,
	steps: number,
	regions: Record<string, Region>,
	isPlayable?: (id: string) => boolean
): string {
	let id = regionId;
	let widest = regionId;
	for (let i = 0; i < steps; i++) {
		const next = regions[id]?.escalatesTo;
		if (!next || !regions[next]) break;
		id = next;
		if (!isPlayable || isPlayable(next)) widest = next;
	}
	return widest;
}

/** Mezcla el escalon vigente con las restricciones propias del modo. */
export function resolveConstraints(
	mode: ModeDef,
	state: GameState,
	regions: Record<string, Region>,
	isPlayable?: (id: string) => boolean
): RoundConstraints {
	const tier = mode.usesLadder ? TIERS[Math.min(state.tier, MAX_TIER)] : TIERS[0];
	const regionId =
		mode.regionSource === 'ladder'
			? widenRegion(state.playerRegionId, tier.widen, regions, isPlayable)
			: state.playerRegionId;

	const base: RoundConstraints = {
		regionId,
		timeLimitSec: mode.usesLadder ? tier.timeLimitSec : null,
		allowPan: tier.allowPan,
		allowZoom: tier.allowZoom,
		allowMove: tier.allowMove,
		showCompass: tier.showCompass,
		difficultyPct: mode.usesLadder ? tier.pct : [0, 100]
	};

	const merged = { ...base, ...mode.base };
	// El modo nunca pisa la region resuelta por la escalera.
	merged.regionId = regionId;
	if (state.thresholdKm !== null) merged.thresholdKm = state.thresholdKm;
	return merged;
}
