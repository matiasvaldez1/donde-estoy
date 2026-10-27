import type { GameState, ModeRecord, RoundResult, Stats } from '../types';
import { localDateString } from '../utils';
import { emptyStats, loadStats, saveStats } from './persist';

/** Cuantas ubicaciones recordamos para no repetirlas enseguida. */
const RECENT_LIMIT = 200;

function emptyRecord(): ModeRecord {
	return { bestScore: 0, bestStreak: 0, bestTier: 0, games: 0, rounds: 0 };
}

class StatsStore {
	current = $state<Stats>(emptyStats());

	load(): void {
		this.current = loadStats();
	}

	private persist(): void {
		saveStats(this.current);
	}

	recordRound(modeId: string, result: RoundResult): void {
		const record = this.current.byMode[modeId] ?? emptyRecord();
		record.rounds += 1;
		record.bestTier = Math.max(record.bestTier, result.tier);
		this.current.byMode[modeId] = record;
		this.current.totalRounds += 1;
		this.current.totalScore += result.score;

		const recent = [result.location.id, ...this.current.recentLocationIds.filter((id) => id !== result.location.id)];
		this.current.recentLocationIds = recent.slice(0, RECENT_LIMIT);
		this.persist();
	}

	recordGame(state: GameState): void {
		const record = this.current.byMode[state.modeId] ?? emptyRecord();
		record.games += 1;
		record.bestScore = Math.max(record.bestScore, state.totalScore);
		record.bestStreak = Math.max(record.bestStreak, state.bestStreak);
		record.bestTier = Math.max(record.bestTier, state.tier);
		this.current.byMode[state.modeId] = record;
		this.persist();
	}

	recordDaily(date: string, total: number, scores: number[], grid: string): void {
		this.current.daily[date] = { date, total, scores, grid };
		this.persist();
	}

	dailyDone(date: string): boolean {
		return !!this.current.daily[date];
	}

	/** Contador visible de panoramas cargados hoy, para vigilar la cuota. */
	countPano(): void {
		const today = localDateString();
		this.current.panoLoads[today] = (this.current.panoLoads[today] ?? 0) + 1;
		for (const key of Object.keys(this.current.panoLoads)) {
			if (key < today) delete this.current.panoLoads[key];
		}
		this.persist();
	}

	get panosToday(): number {
		return this.current.panoLoads[localDateString()] ?? 0;
	}

	get recentIds(): Set<string> {
		return new Set(this.current.recentLocationIds);
	}

	reset(): void {
		this.current = emptyStats();
		this.persist();
	}
}

export const stats = new StatsStore();
