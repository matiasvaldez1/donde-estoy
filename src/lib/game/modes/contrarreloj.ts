import type { ModeDef } from '../../types';
import { scorePin } from '../scoring';

export const TOTAL_CLOCK_SEC = 300;

/** Para avanzar la escalera aca hay que acertar bien, no apenas. */
const ADVANCE_SCORE = 3000;

export const contrarreloj: ModeDef = {
	id: 'contrarreloj',
	name: 'Contrarreloj',
	tagline: '5 minutos. Todas las rondas que aguantes.',
	icon: 'contrarreloj',
	rounds: 'until-fail',
	regionSource: 'ladder',
	usesLadder: true,
	guessKind: 'pin',
	base: { timeLimitSec: null },
	totalClockSec: TOTAL_CLOCK_SEC,
	scoreRound: (ctx) => {
		const { score } = scorePin(ctx.guess, ctx.location, ctx.region);
		const left = ctx.state.clockLeftSec ?? 0;
		const elapsed = ctx.guess?.elapsedSec ?? 0;
		const bonus = Math.max(0, Math.round((left - elapsed) * 2));
		return { score: score + (score > 0 ? bonus : 0), passed: score >= ADVANCE_SCORE };
	},
	isOver: (state) => (state.clockLeftSec ?? 0) <= 0
};
