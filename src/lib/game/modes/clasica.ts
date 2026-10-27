import type { ModeDef } from '../../types';
import { PASS_SCORE, scorePin } from '../scoring';

export const ROUNDS = 5;

export const clasica: ModeDef = {
	id: 'clasica',
	name: 'Clásica',
	tagline: '5 rondas en la región que elijas. Sin apuro.',
	icon: 'clasica',
	rounds: ROUNDS,
	regionSource: 'player',
	usesLadder: false,
	guessKind: 'pin',
	base: { timeLimitSec: null },
	scoreRound: (ctx) => {
		const { score } = scorePin(ctx.guess, ctx.location, ctx.region);
		return { score, passed: score >= PASS_SCORE };
	},
	isOver: (state) => state.results.length >= ROUNDS
};
