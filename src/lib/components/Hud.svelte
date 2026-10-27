<script lang="ts">
	import type { GameState, ModeDef, Region, RoundConstraints } from '$lib/types';
	import { MAX_TIER } from '$lib/game/ladder';
	import { formatScore } from '$lib/utils';
	import { stats } from '$lib/stores/stats.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import Timer from './Timer.svelte';

	let {
		mode,
		state,
		region,
		constraints,
		startedAt,
		onexpire,
		onquit
	}: {
		mode: ModeDef;
		state: GameState;
		region: Region | undefined;
		constraints: RoundConstraints;
		startedAt: number;
		onexpire: () => void;
		onquit: () => void;
	} = $props();

	/** Lo que el escalón te sacó, dicho en voz alta. */
	const locks = $derived(
		[
			constraints.allowMove ? null : 'sin moverse',
			constraints.allowZoom ? null : 'sin zoom',
			constraints.allowPan ? null : 'sin girar',
			constraints.showCompass ? null : 'sin brújula'
		].filter(Boolean) as string[]
	);

	/*
	 * La temperatura del HUD sube con el escalón: verde mientras zafás,
	 * amarillo cuando aprieta, rojo cuando ya no hay dónde agarrarse.
	 */
	const heat = $derived(
		!mode.usesLadder || state.tier <= 1 ? 'accent' : state.tier <= 3 ? 'warning' : 'danger'
	);
	const HEAT_BORDER = { accent: 'border-accent', warning: 'border-warning', danger: 'border-danger' };
	const HEAT_TEXT = { accent: 'text-accent', warning: 'text-warning', danger: 'text-danger' };
</script>

<div
	class="flex items-center gap-4 border-b-4 {HEAT_BORDER[
		heat
	]} bg-bg-secondary px-4 py-3 font-display text-[10px] leading-none"
>
	<span class="flex items-center gap-2 text-text-primary">
		<Icon name={mode.icon} size={16} class={HEAT_TEXT[heat]} />
		<span class="hidden sm:inline">{mode.name}</span>
	</span>

	<span class="text-text-secondary">
		{#if typeof mode.rounds === 'number'}
			{state.results.length + 1}/{mode.rounds}
		{:else}
			#{state.results.length + 1}
		{/if}
	</span>

	<span class="text-text-primary">{formatScore(state.totalScore)}</span>

	{#if mode.usesLadder}
		<span class={HEAT_TEXT[heat]}>R{state.streak}</span>
		<span class="text-text-muted">E{state.tier}/{MAX_TIER}</span>
	{/if}

	{#if region}
		<span class="hidden border-2 border-border px-2 py-1 text-text-secondary md:inline">
			{region.name}
		</span>
	{/if}

	{#if constraints.thresholdKm}
		<span class="text-warning">±{Math.round(constraints.thresholdKm)}km</span>
	{/if}

	{#each locks as lock}
		<span class="hidden items-center gap-1 text-danger lg:inline-flex">
			<Icon name="candado" size={8} />
			{lock}
		</span>
	{/each}

	<span class="ml-auto flex items-center gap-4">
		{#if state.clockLeftSec !== null}
			<Timer limitSec={state.clockLeftSec} {startedAt} {onexpire} />
		{:else}
			<Timer limitSec={constraints.timeLimitSec} {startedAt} {onexpire} />
		{/if}

		{#if import.meta.env.DEV}
			<span class="text-text-muted" title="Panoramas cargados hoy (cuota de Google)">
				{stats.panosToday}
			</span>
		{/if}

		<button
			onclick={onquit}
			class="press text-text-muted hover:text-danger"
			title="Salir de la partida"
			aria-label="Salir de la partida"
		>
			<Icon name="salir" size={12} />
		</button>
	</span>
</div>
