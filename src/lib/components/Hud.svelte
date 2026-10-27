<script lang="ts">
	import type { GameState, ModeDef, Region, RoundConstraints } from '$lib/types';
	import { MAX_TIER } from '$lib/game/ladder';
	import { formatScore } from '$lib/utils';
	import { stats } from '$lib/stores/stats.svelte';
	import Timer from './Timer.svelte';

	let {
		mode,
		state,
		region,
		constraints,
		startedAt,
		onexpire
	}: {
		mode: ModeDef;
		state: GameState;
		region: Region | undefined;
		constraints: RoundConstraints;
		startedAt: number;
		onexpire: () => void;
	} = $props();

	/** Lo que el escalon te quito, dicho en voz alta. */
	const locks = $derived(
		[
			constraints.allowMove ? null : 'sin moverse',
			constraints.allowZoom ? null : 'sin zoom',
			constraints.allowPan ? null : 'sin girar',
			constraints.showCompass ? null : 'sin brújula'
		].filter(Boolean) as string[]
	);
</script>

<div class="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border bg-bg-secondary px-4 py-2.5 text-sm">
	<span class="font-semibold text-text-primary">{mode.icon} {mode.name}</span>

	{#if typeof mode.rounds === 'number'}
		<span class="text-text-secondary">Ronda {state.results.length + 1}/{mode.rounds}</span>
	{:else}
		<span class="text-text-secondary">Ronda {state.results.length + 1}</span>
	{/if}

	<span class="text-text-secondary">{formatScore(state.totalScore)} pts</span>

	{#if mode.usesLadder}
		<span class="text-accent">Racha {state.streak}</span>
		<span class="text-text-muted">Escalón {state.tier}/{MAX_TIER}</span>
	{/if}

	{#if region}
		<span class="rounded bg-bg-tertiary px-2 py-0.5 text-xs text-text-secondary">
			{region.name}
		</span>
	{/if}

	{#if constraints.thresholdKm}
		<span class="text-warning">margen {Math.round(constraints.thresholdKm)} km</span>
	{/if}

	{#each locks as lock}
		<span class="rounded bg-bg-tertiary px-2 py-0.5 text-xs text-warning">{lock}</span>
	{/each}

	<div class="ml-auto flex items-center gap-4">
		{#if state.clockLeftSec !== null}
			<Timer limitSec={state.clockLeftSec} {startedAt} {onexpire} />
		{:else}
			<Timer limitSec={constraints.timeLimitSec} {startedAt} {onexpire} />
		{/if}
		<span class="text-xs text-text-muted" title="Panoramas cargados hoy (cuota de Google)">
			{stats.panosToday} panos hoy
		</span>
	</div>
</div>
