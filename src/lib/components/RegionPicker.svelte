<script lang="ts">
	import type { Region } from '$lib/types';
	import { isThin } from '$lib/data/regions';
	import Chip from '$lib/ui/Chip.svelte';

	let {
		regions,
		selected,
		onselect
	}: {
		regions: Record<string, Region>;
		selected: string;
		onselect: (regionId: string) => void;
	} = $props();

	const GROUPS: Array<{ kind: Region['kind']; label: string }> = [
		{ kind: 'city', label: 'Ciudades' },
		{ kind: 'admin1', label: 'Provincias' },
		{ kind: 'country', label: 'Países' },
		{ kind: 'bloc', label: 'Bloques' },
		{ kind: 'continent', label: 'Continentes' },
		{ kind: 'world', label: 'Mundo' }
	];

	/** Solo lo que tiene pool: el resto aparece cuando lo hornees. */
	const playable = $derived(
		Object.values(regions)
			.filter((r) => r.locationCount >= 20)
			.sort((a, b) => a.name.localeCompare(b.name, 'es'))
	);
</script>

<div class="space-y-5">
	{#each GROUPS as group}
		{@const list = playable.filter((r) => r.kind === group.kind)}
		{#if list.length}
			<div>
				<h3 class="mb-2 font-display text-[8px] tracking-wide text-text-muted uppercase">
					{group.label}
				</h3>
				<div class="flex flex-wrap gap-2">
					{#each list as region (region.id)}
						<Chip
							selected={selected === region.id}
							tone={isThin(region) ? 'warning' : 'neutral'}
							title={isThin(region) ? 'Pocas ubicaciones todavía' : undefined}
							onclick={() => onselect(region.id)}
						>
							{region.name}
							<span class="ml-2 opacity-60">{region.locationCount}</span>
						</Chip>
					{/each}
				</div>
			</div>
		{/if}
	{/each}

	{#if !playable.length}
		<p class="text-text-muted">
			Todavía no hay ninguna región con ubicaciones.
			{#if import.meta.env.DEV}
				Corré <code>pnpm tsx scripts/seed-pool.ts</code> o <code>pnpm bake --region ar</code>.
			{/if}
		</p>
	{/if}
</div>
