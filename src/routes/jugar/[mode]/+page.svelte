<script lang="ts">
	import { get } from 'svelte/store';
	import { page } from '$app/stores';
	import { afterNavigate, goto } from '$app/navigation';
	import { getMode } from '$lib/game/modes';
	import { dailyNumber, ROUNDS as DIARIO_ROUNDS } from '$lib/game/modes/diario';
	import { MAX_ROUND_SCORE } from '$lib/game/scoring';
	import { Session } from '$lib/stores/session.svelte';
	import { settings } from '$lib/stores/settings.svelte';
	import { stats } from '$lib/stores/stats.svelte';
	import { panoDriver } from '$lib/streetview/pano';
	import { formatKm, formatScore, localDateString } from '$lib/utils';
	import AdminPicker from '$lib/components/AdminPicker.svelte';
	import GuessMap from '$lib/components/GuessMap.svelte';
	import Hud from '$lib/components/Hud.svelte';
	import PanoEmbed from '$lib/components/PanoEmbed.svelte';
	import PanoJs from '$lib/components/PanoJs.svelte';
	import ResultMap from '$lib/components/ResultMap.svelte';
	import ShareGrid from '$lib/components/ShareGrid.svelte';

	const modeId = $derived($page.params.mode ?? '');
	const today = localDateString();

	let session = $state<Session | null>(null);
	let pin = $state<{ lat: number; lng: number } | null>(null);
	let mapBig = $state(false);
	let dailyLocked = $state(false);

	let builtFor: string | null = null;

	/**
	 * Fuera del grafo reactivo a propósito. Session tiene campos $state: si se
	 * construye dentro de un $effect, las señales nacen dentro de ese efecto y
	 * lo que escribe el constructor lo vuelve a ensuciar, en loop. untrack no
	 * alcanza, porque solo tapa las lecturas.
	 */
	function build(id: string): void {
		if (builtFor === id) return;
		builtFor = id;

		const mode = getMode(id);
		if (!mode) {
			goto('/');
			return;
		}
		settings.load();
		stats.load();
		dailyLocked = false;

		if (mode.id === 'diario' && stats.dailyDone(today)) {
			dailyLocked = true;
			session = null;
			return;
		}

		pin = null;
		const created = new Session(
			mode,
			settings.current.playerRegionId,
			mode.id === 'diario' ? today : null
		);
		session = created;
		created.init();
	}

	// Al montar, y de nuevo si se navega a otro modo sin desmontar la página.
	build(get(page).params.mode ?? '');
	afterNavigate(() => build(get(page).params.mode ?? ''));

	const mode = $derived(getMode(modeId));
	const game = $derived(session?.state ?? null);
	const current = $derived(game?.current ?? null);
	const guessKind = $derived(
		mode && session?.region ? (mode.guessKindFor?.(session.region) ?? mode.guessKind) : 'pin'
	);
	const showResult = $derived(game?.status === 'result' || game?.status === 'over');
	const maxTotal = $derived(typeof mode?.rounds === 'number' ? mode.rounds * MAX_ROUND_SCORE : 0);

	function submitPin() {
		if (!session || !pin || !current) return;
		session.submit({
			lat: pin.lat,
			lng: pin.lng,
			elapsedSec: (Date.now() - current.startedAt) / 1000,
			timedOut: false
		});
	}

	function submitAdmin(answer: { cc?: string; admin1?: string }) {
		if (!session || !current) return;
		session.submit({
			...answer,
			elapsedSec: (Date.now() - current.startedAt) / 1000,
			timedOut: false
		});
	}

	async function nextRound() {
		pin = null;
		mapBig = false;
		await session?.next();
	}

	function onKey(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement) return;
		if (event.key === 'Enter') {
			if (showResult && game?.status === 'result') nextRound();
			else if (pin) submitPin();
		}
		if (event.key === 'm' && !showResult) mapBig = !mapBig;
	}
</script>

<svelte:window onkeydown={onKey} />

{#if dailyLocked}
	{@const saved = stats.current.daily[today]}
	<div class="mx-auto max-w-xl space-y-4 p-8">
		<h1 class="text-xl font-semibold text-text-primary">El desafío de hoy ya está jugado</h1>
		<p class="text-sm text-text-muted">Vuelve mañana con cinco lugares nuevos.</p>
		<ShareGrid
			number={dailyNumber(today)}
			total={saved.total}
			grid={saved.grid}
			max={DIARIO_ROUNDS * MAX_ROUND_SCORE}
		/>
		<a href="/" class="inline-block text-sm text-accent hover:underline">← Volver al menú</a>
	</div>
{:else if !session || session.loading}
	<div class="flex h-screen items-center justify-center text-sm text-text-muted">Preparando la partida…</div>
{:else if session.error && !current}
	<div class="mx-auto max-w-xl space-y-3 p-8">
		<h1 class="text-xl font-semibold text-danger">No se pudo arrancar</h1>
		<p class="text-sm text-text-secondary">{session.error}</p>
		<a href="/" class="inline-block text-sm text-accent hover:underline">← Volver al menú</a>
	</div>
{:else if game && mode}
	<div class="flex h-screen flex-col">
		{#if current}
			<Hud
				{mode}
				state={game}
				region={session.region}
				constraints={current.constraints}
				startedAt={current.startedAt}
				onexpire={() => session?.timeout()}
			/>
		{/if}

		<div class="relative flex-1 overflow-hidden">
			{#if current}
				{#key current.location.id}
					{#if panoDriver() === 'embed'}
						<PanoEmbed location={current.location} />
					{:else}
						<PanoJs location={current.location} constraints={current.constraints} />
					{/if}
				{/key}
			{/if}

			{#if current && !showResult}
				<!--
					z-20 no es decorativo: el canvas WebGL del panorama de Google se come los
					clicks de todo lo que no tenga z-index explícito, aunque se vea por encima.
					Sin esto no se puede marcar el punto en el mapa.
				-->
				<div
					class="absolute right-4 bottom-4 z-20 flex flex-col overflow-hidden rounded border border-border bg-bg-secondary shadow-xl transition-all
						{mapBig ? 'h-[70vh] w-[min(46rem,85vw)]' : 'h-56 w-72'}"
				>
					<div class="flex items-center justify-between px-2 py-1 text-xs text-text-muted">
						<span>{guessKind === 'pin' ? 'Marcá en el mapa' : 'Elegí la respuesta'}</span>
						{#if guessKind === 'pin'}
							<button onclick={() => (mapBig = !mapBig)} class="px-1 hover:text-text-primary">
								{mapBig ? '▾ chico' : '▴ grande'} <span class="opacity-60">(m)</span>
							</button>
						{/if}
					</div>

					<div class="flex-1">
						{#if guessKind === 'pin'}
							{#if session.region}
								<GuessMap region={session.region} labels={settings.current.mapLabels} bind:value={pin} />
							{/if}
						{:else}
							<AdminPicker kind={guessKind} regions={session.regions} onpick={submitAdmin} />
						{/if}
					</div>

					{#if guessKind === 'pin'}
						<button
							onclick={submitPin}
							disabled={!pin}
							class="bg-accent px-3 py-2 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-hover disabled:bg-bg-tertiary disabled:text-text-muted"
						>
							{pin ? 'Adivinar' : 'Marcá un punto'}
						</button>
					{/if}
				</div>
			{/if}

			{#if showResult && session.last}
				{@const result = session.last}
				<div class="absolute inset-0 z-30 flex items-center justify-center bg-bg-primary/90 p-4">
					<div class="w-full max-w-2xl space-y-4 rounded border border-border bg-bg-secondary p-5">
						<div class="flex items-baseline gap-4">
							<h2 class="text-2xl font-semibold text-text-primary">
								{formatScore(result.score)} pts
							</h2>
							{#if result.distanceKm !== null}
								<span class="text-sm text-text-secondary">a {formatKm(result.distanceKm)}</span>
							{:else if result.guess?.timedOut}
								<span class="text-sm text-danger">se te acabó el tiempo</span>
							{/if}
							{#if result.passed}
								<span class="text-sm text-accent">· acertada</span>
							{/if}
						</div>

						<p class="text-sm text-text-muted">
							{result.location.admin1}, {result.location.cc.toUpperCase()} · imagen de {result
								.location.ym}
						</p>

						<div class="h-64 overflow-hidden rounded border border-border">
							<ResultMap {result} />
						</div>

						{#if game.status === 'over'}
							<div class="space-y-3">
								<p class="text-text-primary">
									Total: <strong>{formatScore(game.totalScore)}</strong>
									{#if maxTotal}<span class="text-text-muted">/ {formatScore(maxTotal)}</span>{/if}
									{#if mode.usesLadder}
										<span class="text-text-muted"> · mejor racha {game.bestStreak}</span>
									{/if}
								</p>

								{#if session.date}
									<ShareGrid
										number={dailyNumber(session.date)}
										total={game.totalScore}
										grid={session.grid()}
										max={DIARIO_ROUNDS * MAX_ROUND_SCORE}
									/>
								{/if}

								<div class="flex gap-3">
									<a
										href="/"
										class="rounded bg-accent px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-hover"
									>
										Volver al menú
									</a>
									<a href="/stats" class="rounded border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover">
										Ver estadísticas
									</a>
								</div>
							</div>
						{:else}
							<div class="flex items-center gap-3">
								<button
									onclick={nextRound}
									class="rounded bg-accent px-4 py-2 text-sm font-medium text-bg-primary hover:bg-accent-hover"
								>
									Siguiente ronda <span class="opacity-60">(Enter)</span>
								</button>
								<button
									onclick={() => session?.end()}
									class="rounded border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
								>
									Terminar
								</button>
							</div>
						{/if}

						{#if session.error}
							<p class="text-sm text-danger">{session.error}</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
