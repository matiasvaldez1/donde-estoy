import type { Settings, Stats } from '../types';

const PREFIX = 'de:v1:';
export const SCHEMA_VERSION = 1;

export const STATS_KEY = `${PREFIX}stats`;
export const SETTINGS_KEY = `${PREFIX}settings`;

export function emptyStats(): Stats {
	return {
		schemaVersion: SCHEMA_VERSION,
		byMode: {},
		daily: {},
		recentLocationIds: [],
		panoLoads: {},
		totalScore: 0,
		totalRounds: 0
	};
}

export function defaultSettings(): Settings {
	return {
		schemaVersion: SCHEMA_VERSION,
		playerRegionId: 'ar',
		mapLabels: true
	};
}

function read<T>(key: string, fallback: T): T {
	if (typeof localStorage === 'undefined') return fallback;
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return fallback;
		return migrate({ ...fallback, ...JSON.parse(raw) } as T);
	} catch {
		return fallback;
	}
}

function write(key: string, value: unknown): void {
	if (typeof localStorage === 'undefined') return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// Cuota llena o modo privado: el juego sigue, las estadisticas no.
	}
}

/** Punto unico para futuros cambios de formato. */
function migrate<T>(value: T): T {
	return value;
}

export const loadStats = (): Stats => read(STATS_KEY, emptyStats());
export const saveStats = (stats: Stats): void => write(STATS_KEY, stats);
export const loadSettings = (): Settings => read(SETTINGS_KEY, defaultSettings());
export const saveSettings = (settings: Settings): void => write(SETTINGS_KEY, settings);

/** Export/import en JSON, para que las estadisticas sobrevivan un borrado. */
export function exportAll(): string {
	return JSON.stringify({ stats: loadStats(), settings: loadSettings() }, null, '\t');
}

export function importAll(json: string): void {
	const parsed = JSON.parse(json) as { stats?: Stats; settings?: Settings };
	if (parsed.stats) saveStats({ ...emptyStats(), ...parsed.stats });
	if (parsed.settings) saveSettings({ ...defaultSettings(), ...parsed.settings });
}
