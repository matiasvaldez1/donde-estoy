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
	import Globe from '$lib/components/Globe.svelte';
	import GuessMap from '$lib/components/GuessMap.svelte';
	import Hud from '$lib/components/Hud.svelte';
	import PanoEmbed from '$lib/components/PanoEmbed.svelte';
	import PanoJs from '$lib/components/PanoJs.svelte';
	import ResultMap from '$lib/components/ResultMap.svelte';
	import ShareGrid from '$lib/components/ShareGrid.svelte';
	import Button from '$lib/ui/Button.svelte';
	import Icon from '$lib/ui/Icon.svelte';

	const today = localDateString();

	let session = $state<Session | null>(null);
	let pin = $state<{ lat: number; lng: number } | null>(null);
	let mapBig = $state(false);
	let dailyLocked = $state(false);
	let globeFailed = $state(false);
	let shown = $state(0);
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

	build(get(page).params.mode ?? '');
	afterNavigate(() => build(get(page).params.mode ?? ''));

	const mode = $derived(getMode($page.params.mode ?? ''));
	const game = $derived(session?.state ?? null);
	const current = $derived(game?.current ?? null);
	const guessKind = $derived(
		mode && session?.region ? (mode.guessKindFor?.(session.region) ?? mode.guessKind) : 'pin'
	);
	const showResult = $derived(game?.status === 'result' || game?.status === 'over');
	const maxTotal = $derived(typeof mode?.rounds === 'number' ? mode.rounds * MAX_ROUND_SCORE : 0);

	/** El puntaje sube a los saltos, no con una interpolación suave. */
	$effect(() => {
		const target = session?.last?.score ?? 0;
		if (!showResult) {
			shown = 0;
			return;
		}
		const STEPS = 12;
		let i = 0;
		const id = setInterval(() => {
			i++;
			shown = Math.round((target * i) / STEPS);
			if (i >= STEPS) clearInterval(id);
		}, 45);
		return () => clearInterval(id);
	});

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
		globeFailed = false;
		await session?.next();
	}

	/** Salir en mitad de una corrida pide confirmación: se pierde la racha. */
	function quit() {
		const live = (game?.results.length ?? 0) > 0 && game?.status !== 'over';
		if (live && !confirm('¿Salir de la partida? Se pierde lo que llevás.')) return;
		goto('/');
	}

	function onKey(event: KeyboardEvent) {
		if (event.target instanceof HTMLInputElement) return;
		if (event.key === 'Escape') {
			if (showResult && game?.status === 'result') nextRound();
			else quit();
			return;
		}
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
	<div class="mx-auto max-w-xl space-y-6 p-8">
		<h1 class="font-display text-sm leading-relaxed text-text-primary">
			El desafío de hoy ya está jugado
		</h1>
		<p class="text-text-muted">Volvé mañana con cinco lugares nuevos.</p>
		<ShareGrid
			number={dailyNumber(today)}
			total={saved.total}
			grid={saved.grid}
			max={DIARIO_ROUNDS * MAX_ROUND_SCORE}
		/>
		<Button href="/">Volver al menú</Button>
	</div>
{:else if !session || session.loading}
	<div class="flex h-dvh items-center justify-center font-display text-xs text-text-muted">
		Preparando la partida…
	</div>
{:else if session.error && !current}
	<div class="mx-auto max-w-xl space-y-5 p-8">
		<h1 class="font-display text-sm leading-relaxed text-danger">No se pudo arrancar</h1>
		<p class="text-text-secondary">{session.error}</p>
		<Button href="/">Volver al menú</Button>
	</div>
{:else if game && mode}
	<div class="flex h-dvh flex-col">
		{#if current}
			<Hud
				{mode}
				state={game}
				region={session.region}
				constraints={current.constraints}
				startedAt={current.startedAt}
				onexpire={() => session?.timeout()}
				onquit={quit}
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
					class="absolute right-4 bottom-4 z-20 flex flex-col border-4 border-border bg-bg-secondary transition-all duration-150
						{mapBig ? 'h-[70vh] w-[min(46rem,85vw)]' : 'h-64 w-80'}"
				>
					<div
						class="flex items-center justify-between border-b-4 border-border px-2 py-1 font-display text-[8px] text-text-muted"
					>
						<span>{guessKind === 'pin' ? 'Marcá en el mapa' : 'Elegí la respuesta'}</span>
						<button
							onclick={() => (mapBig = !mapBig)}
							class="press flex items-center gap-1 px-1 hover:text-text-primary"
							aria-label={mapBig ? 'Achicar el mapa' : 'Agrandar el mapa'}
						>
							<Icon name={mapBig ? 'down' : 'up'} size={8} />
							(M)
						</button>
					</div>

					<div class="flex-1 overflow-hidden">
						{#if guessKind === 'pin'}
							{#if session.region}
								<GuessMap
									region={session.region}
									labels={settings.current.mapLabels}
									bind:value={pin}
								/>
							{/if}
						{:else}
							<AdminPicker kind={guessKind} regions={session.regions} onpick={submitAdmin} />
						{/if}
					</div>

					{#if guessKind === 'pin'}
						<div class="border-t-4 border-border p-2">
							<Button variant="primary" full disabled={!pin} onclick={submitPin}>
								{pin ? 'Adivinar' : 'Marcá un punto'}
							</Button>
						</div>
					{/if}
				</div>
			{/if}

			{#if showResult && session.last}
				{@const result = session.last}
				<div
					class="absolute inset-0 z-30 flex items-center justify-center bg-bg-primary/95 p-4"
					role="dialog"
					aria-modal="true"
					aria-label="Resultado de la ronda"
				>
					<div class="nes-container is-dark w-full max-w-2xl space-y-4">
						<div class="flex flex-wrap items-baseline gap-4">
							<span class="font-display text-xl text-accent">{formatScore(shown)}</span>
							{#if result.distanceKm !== null}
								<span class="text-text-secondary">a {formatKm(result.distanceKm)}</span>
							{:else if result.guess?.timedOut}
								<span class="text-danger">se te acabó el tiempo</span>
							{/if}
							{#if result.passed}
								<span class="font-display text-[10px] text-accent">acertada</span>
							{/if}
						</div>

						<p class="text-text-muted">
							{result.location.admin1}, {result.location.cc.toUpperCase()} · imagen de {result
								.location.ym}
						</p>

						<div class="h-80 overflow-hidden border-4 border-border">
							{#if globeFailed}
								<ResultMap {result} />
							{:else}
								<Globe {result} onfail={() => (globeFailed = true)} />
							{/if}
						</div>

						{#if game.status === 'over'}
							<div class="space-y-4">
								<p class="font-display text-xs leading-relaxed text-text-primary">
									Total {formatScore(game.totalScore)}{#if maxTotal}<span class="text-text-muted"
											>/{formatScore(maxTotal)}</span
										>{/if}
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

								<div class="flex flex-wrap gap-3">
									<Button variant="primary" href="/">Volver al menú</Button>
									<Button href="/stats">Estadísticas</Button>
								</div>
							</div>
						{:else}
							<div class="flex flex-wrap items-center gap-3">
								<Button variant="primary" onclick={nextRound}>Siguiente (Enter)</Button>
								<Button onclick={() => session?.end()}>Terminar</Button>
							</div>
						{/if}

						{#if session.error}
							<p class="text-danger">{session.error}</p>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
