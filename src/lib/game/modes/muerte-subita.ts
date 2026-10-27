import type { ModeDef } from '../../types';
import { scorePin } from '../scoring';

export const muerteSubita: ModeDef = {
	id: 'muerte-subita',
	name: 'Muerte Súbita',
	tagline: 'El margen de error se encoge cada ronda. Hasta que no entres.',
	icon: 'muerte-subita',
	rounds: 'until-fail',
	regionSource: 'ladder',
	usesLadder: true,
	guessKind: 'pin',
	base: {},
	thresholdFactor: 0.25,
	thresholdShrink: 0.75,
	scoreRound: (ctx) => {
		const { score, distanceKm } = scorePin(ctx.guess, ctx.location, ctx.region);
		const threshold = ctx.constraints.thresholdKm ?? Infinity;
		const passed = distanceKm !== null && distanceKm <= threshold;
		return { score, passed };
	},
	isOver: (state) => {
		const last = state.results[state.results.length - 1];
		return !!last && !last.passed;
	}
};
