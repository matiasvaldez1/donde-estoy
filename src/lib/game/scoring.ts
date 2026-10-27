import type { Guess, GameLocation, Region } from '../types';
import { haversineKm } from '../utils';

export const MAX_ROUND_SCORE = 5000;

/** Puntaje minimo que cuenta como acierto y hace avanzar la escalera. */
export const PASS_SCORE = 2500;

/**
 * Curva de GeoGuessr, normalizada por la diagonal de la region en juego:
 * errar 40 km en CABA pesa igual que errar 4000 km en el mundo.
 */
export function roundScore(distanceKm: number, diagonalKm: number): number {
	if (diagonalKm <= 0) return 0;
	return Math.round(MAX_ROUND_SCORE * Math.exp((-10 * distanceKm) / diagonalKm));
}

export function guessDistanceKm(guess: Guess | null, location: GameLocation): number | null {
	if (!guess || guess.lat === undefined || guess.lng === undefined) return null;
	return haversineKm(guess.lat, guess.lng, location.lat, location.lng);
}

export function scorePin(
	guess: Guess | null,
	location: GameLocation,
	region: Region
): { score: number; distanceKm: number | null } {
	const distanceKm = guessDistanceKm(guess, location);
	if (distanceKm === null) return { score: 0, distanceKm: null };
	return { score: roundScore(distanceKm, region.diagonalKm), distanceKm };
}

/** Cuadrado de color para la grilla compartible del desafio diario. */
export function scoreTile(score: number, answered: boolean): string {
	if (!answered) return '⬜';
	if (score >= 4500) return '🟩';
	if (score >= 3000) return '🟨';
	if (score >= 1500) return '🟧';
	return '⬛';
}
