import type { ModeDef } from '../../types';
import { PASS_SCORE, scorePin } from '../scoring';

/**
 * El modo central: cada ronda acertada ensancha el mundo y acorta la correa.
 * No termina solo, lo cortas vos.
 */
export const escalera: ModeDef = {
	id: 'escalera',
	name: 'Escalera',
	tagline: 'Arrancá en tu provincia y terminá en el mundo. Si podés.',
	icon: 'escalera',
	rounds: 'until-fail',
	regionSource: 'ladder',
	usesLadder: true,
	guessKind: 'pin',
	base: {},
	scoreRound: (ctx) => {
		const { score } = scorePin(ctx.guess, ctx.location, ctx.region);
		return { score, passed: score >= PASS_SCORE };
	},
	isOver: () => false
};
