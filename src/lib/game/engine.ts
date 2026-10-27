import type {
	GameLocation,
	GameState,
	Guess,
	ModeDef,
	Region,
	RoundConstraints,
	RoundResult
} from '../types';
import { guessDistanceKm } from './scoring';
import { nextTierOnFail, nextTierOnPass } from './ladder';

export interface EngineCtx {
	mode: ModeDef;
	regions: Record<string, Region>;
}

export type EngineAction =
	| { type: 'START_ROUND'; location: GameLocation; constraints: RoundConstraints; now: number }
	| { type: 'SUBMIT_GUESS'; guess: Guess; now: number }
	| { type: 'TIMEOUT'; now: number }
	| { type: 'NEXT_ROUND' }
	| { type: 'END' };

export function initialState(
	mode: ModeDef,
	playerRegionId: string,
	seed: string | null = null
): GameState {
	return {
		modeId: mode.id,
		playerRegionId,
		status: 'idle',
		roundIndex: 0,
		streak: 0,
		bestStreak: 0,
		tier: 0,
		totalScore: 0,
		results: [],
		current: null,
		clockLeftSec: mode.totalClockSec ?? null,
		thresholdKm: null,
		seed
	};
}

/**
 * Reductor puro: nada de DOM, nada de Google, nada de fetch. Quien lo llama
 * elige la ubicacion y despacha START_ROUND, asi todo el loop se testea sin mocks.
 */
export function reduce(state: GameState, action: EngineAction, ctx: EngineCtx): GameState {
	switch (action.type) {
		case 'START_ROUND': {
			const region = ctx.regions[action.constraints.regionId];
			let thresholdKm = state.thresholdKm;
			if (ctx.mode.thresholdFactor && thresholdKm === null && region) {
				thresholdKm = ctx.mode.thresholdFactor * region.diagonalKm;
			}
			const constraints: RoundConstraints = { ...action.constraints };
			if (thresholdKm !== null) constraints.thresholdKm = thresholdKm;
			return {
				...state,
				status: 'playing',
				thresholdKm,
				current: { location: action.location, constraints, startedAt: action.now }
			};
		}

		case 'SUBMIT_GUESS':
		case 'TIMEOUT': {
			if (state.status !== 'playing' || !state.current) return state;
			const { location, constraints, startedAt } = state.current;
			const region = ctx.regions[constraints.regionId];
			if (!region) return state;

			const guess: Guess | null =
				action.type === 'SUBMIT_GUESS'
					? action.guess
					: {
							elapsedSec: Math.max(0, (action.now - startedAt) / 1000),
							timedOut: true
						};

			const distanceKm = guessDistanceKm(guess, location);
			const { score, passed } = ctx.mode.scoreRound({
				location,
				guess,
				distanceKm,
				region,
				constraints,
				state
			});

			const result: RoundResult = {
				location,
				guess,
				distanceKm,
				score,
				passed,
				regionId: region.id,
				tier: state.tier
			};

			const streak = passed ? state.streak + 1 : 0;
			const tier = passed ? nextTierOnPass(state.tier, streak) : nextTierOnFail(state.tier);

			let thresholdKm = state.thresholdKm;
			if (passed && ctx.mode.thresholdShrink && thresholdKm !== null) {
				thresholdKm *= ctx.mode.thresholdShrink;
			}

			let clockLeftSec = state.clockLeftSec;
			if (clockLeftSec !== null) {
				clockLeftSec = Math.max(0, clockLeftSec - (guess?.elapsedSec ?? 0));
			}

			const next: GameState = {
				...state,
				status: 'result',
				results: [...state.results, result],
				totalScore: state.totalScore + score,
				streak,
				bestStreak: Math.max(state.bestStreak, streak),
				tier,
				thresholdKm,
				clockLeftSec
			};

			return ctx.mode.isOver(next) ? { ...next, status: 'over' } : next;
		}

		case 'NEXT_ROUND': {
			if (state.status === 'over') return state;
			const next: GameState = {
				...state,
				status: 'idle',
				roundIndex: state.roundIndex + 1,
				current: null
			};
			return ctx.mode.isOver(next) ? { ...next, status: 'over' } : next;
		}

		case 'END':
			return { ...state, status: 'over', current: null };

		default:
			return state;
	}
}

export function roundsPlayed(state: GameState): number {
	return state.results.length;
}

export function lastResult(state: GameState): RoundResult | null {
	return state.results.length ? state.results[state.results.length - 1] : null;
}
