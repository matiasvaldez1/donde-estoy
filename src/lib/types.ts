import type { IconName } from './ui/icons';

export type RegionKind = 'city' | 'admin1' | 'country' | 'bloc' | 'continent' | 'world';

/** [oeste, sur, este, norte] */
export type BBox = [number, number, number, number];

export interface Region {
	id: string;
	name: string;
	kind: RegionKind;
	parentId: string | null;
	childIds: string[];
	/** Shards hoja con ubicaciones. Los bloques apuntan a un shard _mix. */
	shards: string[];
	bbox: BBox;
	/** [lat, lng] */
	center: [number, number];
	/** Normalizador del puntaje: diagonal de la bbox en km. */
	diagonalKm: number;
	locationCount: number;
	/** Cadena de ampliacion que recorre la escalera. */
	escalatesTo: string | null;
}

/** Se llama GameLocation y no Location para no chocar con el tipo global del DOM. */
export interface GameLocation {
	id: string;
	lat: number;
	lng: number;
	/** Cache refrescable. Si Google lo retira, se resuelve por lat/lng. */
	panoId: string | null;
	cc: string;
	admin1: string;
	/** Fecha de captura, 'YYYY-MM'. */
	ym: string;
	/** Dificultad absoluta 0-100. */
	diff: number;
	/** Percentil de dificultad dentro de su propia region, 0-100. */
	pct: number;
	tags: number;
	/** Rumbo de la calle, para no arrancar mirando una pared. null = sin dato. */
	heading: number | null;
}

export const TAG = {
	RURAL: 1,
	HIGHWAY: 2,
	UNPAVED: 4,
	COASTAL: 8,
	URBAN: 16,
	TRACK: 32
} as const;

export interface RoundConstraints {
	regionId: string;
	timeLimitSec: number | null;
	allowPan: boolean;
	allowZoom: boolean;
	allowMove: boolean;
	showCompass: boolean;
	/** Ventana de percentil de dificultad [min, max]. */
	difficultyPct: [number, number];
	/** Solo muerte subita: error maximo tolerado. */
	thresholdKm?: number;
}

export type ModeId = 'clasica' | 'escalera' | 'racha' | 'contrarreloj' | 'muerte-subita' | 'diario';

export type GuessKind = 'pin' | 'country' | 'admin1';

export interface Guess {
	/** Presente si guessKind === 'pin'. */
	lat?: number;
	lng?: number;
	/** Presente si guessKind === 'country' | 'admin1'. */
	cc?: string;
	admin1?: string;
	elapsedSec: number;
	timedOut: boolean;
}

export interface RoundResult {
	location: GameLocation;
	guess: Guess | null;
	distanceKm: number | null;
	score: number;
	passed: boolean;
	regionId: string;
	tier: number;
}

export interface CurrentRound {
	location: GameLocation;
	constraints: RoundConstraints;
	startedAt: number;
}

export type GameStatus = 'idle' | 'playing' | 'result' | 'over';

export interface GameState {
	modeId: ModeId;
	playerRegionId: string;
	status: GameStatus;
	roundIndex: number;
	streak: number;
	bestStreak: number;
	tier: number;
	totalScore: number;
	results: RoundResult[];
	current: CurrentRound | null;
	/** Reloj global de contrarreloj, en segundos. */
	clockLeftSec: number | null;
	/** Umbral vigente de muerte subita, en km. */
	thresholdKm: number | null;
	/** Semilla del desafio diario. */
	seed: string | null;
}

export interface RoundContext {
	location: GameLocation;
	guess: Guess | null;
	distanceKm: number | null;
	region: Region;
	constraints: RoundConstraints;
	state: GameState;
}

export interface ModeDef {
	id: ModeId;
	name: string;
	tagline: string;
	icon: IconName;
	rounds: number | 'until-fail';
	regionSource: 'player' | 'ladder' | 'seeded';
	usesLadder: boolean;
	guessKind: GuessKind;
	base: Partial<RoundConstraints>;
	/** Reloj global compartido por toda la partida (contrarreloj). */
	totalClockSec?: number;
	/** Muerte subita: umbral inicial como fraccion de la diagonal de la region. */
	thresholdFactor?: number;
	/** Muerte subita: cuanto se encoge el umbral tras cada acierto. */
	thresholdShrink?: number;
	/** Permite que el modo elija entre pais y provincia segun la region. */
	guessKindFor?: (region: Region) => GuessKind;
	scoreRound(ctx: RoundContext): { score: number; passed: boolean };
	isOver(state: GameState): boolean;
}

export interface ModeRecord {
	bestScore: number;
	bestStreak: number;
	bestTier: number;
	games: number;
	rounds: number;
}

export interface DailyRecord {
	date: string;
	total: number;
	scores: number[];
	grid: string;
}

export interface Stats {
	schemaVersion: number;
	byMode: Record<string, ModeRecord>;
	daily: Record<string, DailyRecord>;
	recentLocationIds: string[];
	panoLoads: Record<string, number>;
	totalScore: number;
	totalRounds: number;
}

export interface Settings {
	schemaVersion: number;
	playerRegionId: string;
	mapLabels: boolean;
	mapBig: boolean;
}
