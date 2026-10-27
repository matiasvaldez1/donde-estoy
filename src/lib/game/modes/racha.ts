import type { ModeDef } from '../../types';
import { MAX_ROUND_SCORE } from '../scoring';

/** Paises donde preguntar la provincia tiene mas sentido que preguntar el pais. */
const ADMIN1_COUNTRIES = new Set(['ar', 'mx', 'br']);

export const racha: ModeDef = {
	id: 'racha',
	name: 'Racha',
	tagline: 'Solo el país. Una sola equivocación y se termina.',
	icon: 'racha',
	rounds: 'until-fail',
	regionSource: 'ladder',
	usesLadder: true,
	guessKind: 'country',
	guessKindFor: (region) => {
		const cc = region.id.split('-')[0];
		return region.kind !== 'country' && ADMIN1_COUNTRIES.has(cc) ? 'admin1' : 'country';
	},
	base: {},
	scoreRound: (ctx) => {
		const { guess, location } = ctx;
		if (!guess) return { score: 0, passed: false };
		const passed = guess.admin1
			? guess.admin1 === location.admin1
			: guess.cc === location.cc;
		return { score: passed ? MAX_ROUND_SCORE : 0, passed };
	},
	isOver: (state) => {
		const last = state.results[state.results.length - 1];
		return !!last && !last.passed;
	}
};
