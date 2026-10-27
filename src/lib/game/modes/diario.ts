import type { ModeDef } from '../../types';
import { PASS_SCORE, scorePin } from '../scoring';

export const ROUNDS = 5;

/**
 * Rotacion de alcance por dia de la semana. Determinista a partir de la fecha,
 * asi el desafio es el mismo para todos sin necesidad de servidor.
 */
export const DAILY_SCOPES = [
	'latam', // domingo
	'ar', // lunes
	'cono-sur', // martes
	'latam', // miercoles
	'ar', // jueves
	'americas', // viernes
	'world' // sabado
];

/** 2024-01-01 fue el dia 1. */
const EPOCH = Date.UTC(2023, 11, 31);

export function dailyScopeId(date: string): string {
	const [y, m, d] = date.split('-').map(Number);
	const weekday = new Date(y, m - 1, d).getDay();
	return DAILY_SCOPES[weekday];
}

export function dailyNumber(date: string): number {
	const [y, m, d] = date.split('-').map(Number);
	return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000);
}

export const diario: ModeDef = {
	id: 'diario',
	name: 'Desafío Diario',
	tagline: 'Cinco lugares. Los mismos para todos. Un intento por día.',
	icon: '◈',
	rounds: ROUNDS,
	regionSource: 'seeded',
	usesLadder: false,
	guessKind: 'pin',
	base: { timeLimitSec: 120 },
	scoreRound: (ctx) => {
		const { score } = scorePin(ctx.guess, ctx.location, ctx.region);
		return { score, passed: score >= PASS_SCORE };
	},
	isOver: (state) => state.results.length >= ROUNDS
};
