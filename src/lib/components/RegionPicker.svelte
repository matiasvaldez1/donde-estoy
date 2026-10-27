<script lang="ts">
	import type { Region } from '$lib/types';
	import { isThin } from '$lib/data/regions';

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

<div class="space-y-4">
	{#each GROUPS as group}
		{@const list = playable.filter((r) => r.kind === group.kind)}
		{#if list.length}
			<div>
				<h3 class="mb-2 text-xs font-semibold tracking-wide text-text-muted uppercase">
					{group.label}
				</h3>
				<div class="flex flex-wrap gap-2">
					{#each list as region (region.id)}
						<button
							onclick={() => onselect(region.id)}
							class="rounded border px-3 py-1.5 text-sm transition-colors {selected === region.id
								? 'border-accent bg-accent-muted text-accent'
								: 'border-border bg-bg-secondary text-text-secondary hover:bg-bg-hover hover:text-text-primary'}"
						>
							{region.name}
							<span class="ml-1.5 text-xs text-text-muted">{region.locationCount}</span>
							{#if isThin(region)}
								<span class="ml-1 text-xs text-warning" title="Pocas ubicaciones todavía">·</span>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	{/each}

	{#if !playable.length}
		<p class="text-sm text-text-muted">
			No hay ninguna región con pool. Corré <code>pnpm tsx scripts/seed-pool.ts</code> o
			<code>pnpm bake --region AR</code>.
		</p>
	{/if}
</div>
