<script lang="ts">
	import { MODE_LIST } from '$lib/game/modes';
	import { MAX_TIER } from '$lib/game/ladder';
	import { stats } from '$lib/stores/stats.svelte';
	import { formatDate, formatScore } from '$lib/utils';
	import Card from '$lib/ui/Card.svelte';
	import Heading from '$lib/ui/Heading.svelte';
	import Icon from '$lib/ui/Icon.svelte';
	import PageShell from '$lib/ui/PageShell.svelte';

	$effect(() => stats.load());

	const dailies = $derived(
		Object.values(stats.current.daily)
			.sort((a, b) => b.date.localeCompare(a.date))
			.slice(0, 14)
	);
</script>

<PageShell width="max-w-3xl">
	<section>
		<Heading level={1}>Estadísticas</Heading>
		<div class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
			<Card>
				<p class="font-display text-[8px] text-text-muted">RONDAS</p>
				<p class="mt-2 font-display text-sm text-accent">{stats.current.totalRounds}</p>
			</Card>
			<Card>
				<p class="font-display text-[8px] text-text-muted">PUNTOS</p>
				<p class="mt-2 font-display text-sm text-accent">
					{formatScore(stats.current.totalScore)}
				</p>
			</Card>
			{#if import.meta.env.DEV}
				<Card>
					<p class="font-display text-[8px] text-text-muted">PANOS HOY</p>
					<p class="mt-2 font-display text-sm text-text-primary">{stats.panosToday}</p>
				</Card>
			{/if}
		</div>
	</section>

	<section>
		<Heading>Por modo</Heading>
		<div class="nes-table-responsive mt-4">
			<table class="nes-table is-dark is-bordered w-full">
				<thead>
					<tr class="text-[8px]">
						<th>Modo</th>
						<th>Part.</th>
						<th>Rondas</th>
						<th>Mejor</th>
						<th>Racha</th>
						<th>Esc.</th>
					</tr>
				</thead>
				<tbody>
					{#each MODE_LIST as mode (mode.id)}
						{@const record = stats.current.byMode[mode.id]}
						<tr>
							<td class="w-44 break-words"><span class="flex items-center gap-2">
								<Icon name={mode.icon} size={12} class="text-accent" />
								{mode.name}
								</span>
							</td>
							<td>{record?.games ?? 0}</td>
							<td>{record?.rounds ?? 0}</td>
							<td>{formatScore(record?.bestScore ?? 0)}</td>
							<td>{record?.bestStreak ?? 0}</td>
							<td>{mode.usesLadder ? `${record?.bestTier ?? 0}/${MAX_TIER}` : '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section>
		<Heading>Desafíos diarios</Heading>
		{#if dailies.length}
			<div class="mt-4 space-y-2">
				{#each dailies as day (day.date)}
					<div
						class="flex flex-wrap items-center gap-4 border-4 border-border bg-bg-secondary px-4 py-3"
					>
						<span class="text-text-muted">{formatDate(day.date)}</span>
						<span class="text-lg">{day.grid}</span>
						<span class="ml-auto font-display text-[10px] text-accent">
							{formatScore(day.total)}
						</span>
					</div>
				{/each}
			</div>
		{:else}
			<p class="mt-4 text-text-muted">
				Todavía no jugaste ninguno. Son cinco lugares, los mismos para todos, uno por día.
			</p>
		{/if}
	</section>
</PageShell>
