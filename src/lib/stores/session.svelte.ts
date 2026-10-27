import { initialState, lastResult, reduce } from '../game/engine';
import type { EngineCtx } from '../game/engine';
import { resolveConstraints } from '../game/ladder';
import { dailyScopeId } from '../game/modes/diario';
import { randomRng, seededRng } from '../game/rng';
import { scoreTile } from '../game/scoring';
import { isPlayable, loadRegions } from '../data/regions';
import { loadPool, pickLocation, pickSeries } from '../data/pool';
import type { GameLocation, GameState, Guess, ModeDef, Region } from '../types';
import { stats } from './stats.svelte';

/**
 * Pega el reductor puro con el mundo real: carga regiones, trae el shard que
 * corresponde, elige la ubicacion y despacha. Toda la decision de juego vive en
 * engine.ts; aca solo hay entrada y salida.
 */
export class Session {
	mode: ModeDef;
	state = $state<GameState>() as GameState;
	regions = $state<Record<string, Region>>({});
	loading = $state(true);
	error = $state<string | null>(null);
	/** Fecha del desafio diario, null en el resto de los modos. */
	date: string | null;

	private plan: GameLocation[] | null = null;

	constructor(mode: ModeDef, playerRegionId: string, date: string | null = null) {
		this.mode = mode;
		this.date = date;
		this.state = initialState(mode, playerRegionId, date);
	}

	private get ctx(): EngineCtx {
		return { mode: this.mode, regions: this.regions };
	}

	private playable = (id: string): boolean => isPlayable(this.regions[id]);

	get region(): Region | undefined {
		const id = this.state.current?.constraints.regionId ?? this.state.playerRegionId;
		return this.regions[id];
	}

	get last() {
		return lastResult(this.state);
	}

	async init(): Promise<void> {
		try {
			const { regions } = await loadRegions();
			this.regions = regions;

			if (this.mode.regionSource === 'seeded' && this.date) {
				const scopeId = this.pickDailyScope(this.date);
				this.state = { ...this.state, playerRegionId: scopeId };
				const pool = await loadPool(this.regions[scopeId].shards);
				this.plan = pickSeries(pool, [0, 100], seededRng(this.date), 5);
				if (!this.plan.length) throw new Error('El pool del desafío de hoy está vacío');
			}

			await this.startRound();
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Error desconocido';
		} finally {
			this.loading = false;
		}
	}

	/** El alcance del dia, retrocediendo si todavia no esta horneado. */
	private pickDailyScope(date: string): string {
		const wanted = dailyScopeId(date);
		if (this.playable(wanted)) return wanted;
		let id: string | null = wanted;
		const seen = new Set<string>();
		while (id && !seen.has(id)) {
			seen.add(id);
			const children: string[] = this.regions[id]?.childIds ?? [];
			const hit = children.find((child) => this.playable(child));
			if (hit) return hit;
			id = this.regions[id]?.childIds[0] ?? null;
		}
		return this.playable(this.state.playerRegionId) ? this.state.playerRegionId : 'ar';
	}

	async startRound(): Promise<void> {
		this.error = null;
		const constraints = resolveConstraints(this.mode, this.state, this.regions, this.playable);
		const region = this.regions[constraints.regionId];
		if (!region) {
			this.error = `No conozco la región ${constraints.regionId}`;
			return;
		}

		let location: GameLocation | null;
		if (this.plan) {
			location = this.plan[this.state.roundIndex] ?? null;
		} else {
			const pool = await loadPool(region.shards);
			location = pickLocation(pool, constraints.difficultyPct, randomRng(), stats.recentIds);
		}

		if (!location) {
			this.error = `${region.name} no tiene ubicaciones horneadas todavía`;
			return;
		}

		this.state = reduce(
			this.state,
			{ type: 'START_ROUND', location, constraints, now: Date.now() },
			this.ctx
		);
	}

	submit(guess: Guess): void {
		this.state = reduce(this.state, { type: 'SUBMIT_GUESS', guess, now: Date.now() }, this.ctx);
		this.afterRound();
	}

	timeout(): void {
		this.state = reduce(this.state, { type: 'TIMEOUT', now: Date.now() }, this.ctx);
		this.afterRound();
	}

	async next(): Promise<void> {
		this.state = reduce(this.state, { type: 'NEXT_ROUND' }, this.ctx);
		if (this.state.status === 'idle') await this.startRound();
		else this.afterGame();
	}

	end(): void {
		this.state = reduce(this.state, { type: 'END' }, this.ctx);
		this.afterGame();
	}

	private afterRound(): void {
		const result = this.last;
		if (result) stats.recordRound(this.mode.id, result);
		if (this.state.status === 'over') this.afterGame();
	}

	private afterGame(): void {
		if (this.state.status !== 'over') return;
		stats.recordGame(this.state);
		if (this.date && !stats.dailyDone(this.date)) {
			const scores = this.state.results.map((r) => r.score);
			stats.recordDaily(this.date, this.state.totalScore, scores, this.grid());
		}
	}

	/** Grilla de cuadraditos del desafio diario. */
	grid(): string {
		return this.state.results
			.map((r) => scoreTile(r.score, !r.guess?.timedOut))
			.join('');
	}
}
