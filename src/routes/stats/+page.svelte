<script lang="ts">
	import { MODE_LIST } from '$lib/game/modes';
	import { MAX_TIER } from '$lib/game/ladder';
	import { stats } from '$lib/stores/stats.svelte';
	import { formatDate, formatScore } from '$lib/utils';

	$effect(() => stats.load());

	const dailies = $derived(
		Object.values(stats.current.daily).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14)
	);
</script>

<div class="mx-auto max-w-3xl space-y-8">
	<section>
		<h1 class="text-2xl font-semibold text-text-primary">Estadísticas</h1>
		<div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
			<div class="rounded border border-border bg-bg-secondary p-4">
				<p class="text-xs text-text-muted">Rondas jugadas</p>
				<p class="text-xl font-semibold text-text-primary">{stats.current.totalRounds}</p>
			</div>
			<div class="rounded border border-border bg-bg-secondary p-4">
				<p class="text-xs text-text-muted">Puntos acumulados</p>
				<p class="text-xl font-semibold text-text-primary">{formatScore(stats.current.totalScore)}</p>
			</div>
			<div class="rounded border border-border bg-bg-secondary p-4">
				<p class="text-xs text-text-muted">Panoramas hoy</p>
				<p class="text-xl font-semibold text-text-primary">{stats.panosToday}</p>
			</div>
		</div>
	</section>

	<section>
		<h2 class="mb-3 text-lg font-semibold text-text-primary">Por modo</h2>
		<div class="overflow-x-auto rounded border border-border">
			<table class="w-full text-sm">
				<thead class="bg-bg-tertiary text-left text-xs text-text-muted uppercase">
					<tr>
						<th class="px-3 py-2">Modo</th>
						<th class="px-3 py-2">Partidas</th>
						<th class="px-3 py-2">Rondas</th>
						<th class="px-3 py-2">Mejor puntaje</th>
						<th class="px-3 py-2">Mejor racha</th>
						<th class="px-3 py-2">Escalón</th>
					</tr>
				</thead>
				<tbody>
					{#each MODE_LIST as mode (mode.id)}
						{@const record = stats.current.byMode[mode.id]}
						<tr class="border-t border-border">
							<td class="px-3 py-2 text-text-primary">{mode.icon} {mode.name}</td>
							<td class="px-3 py-2 text-text-secondary">{record?.games ?? 0}</td>
							<td class="px-3 py-2 text-text-secondary">{record?.rounds ?? 0}</td>
							<td class="px-3 py-2 text-text-secondary">{formatScore(record?.bestScore ?? 0)}</td>
							<td class="px-3 py-2 text-text-secondary">{record?.bestStreak ?? 0}</td>
							<td class="px-3 py-2 text-text-muted">
								{mode.usesLadder ? `${record?.bestTier ?? 0}/${MAX_TIER}` : '—'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	{#if dailies.length}
		<section>
			<h2 class="mb-3 text-lg font-semibold text-text-primary">Desafíos diarios</h2>
			<div class="space-y-2">
				{#each dailies as day (day.date)}
					<div class="flex items-center gap-4 rounded border border-border bg-bg-secondary px-4 py-2 text-sm">
						<span class="text-text-muted">{formatDate(day.date)}</span>
						<span class="font-mono">{day.grid}</span>
						<span class="ml-auto text-text-primary">{formatScore(day.total)}</span>
					</div>
				{/each}
			</div>
		</section>
	{/if}
</div>
