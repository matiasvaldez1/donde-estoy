<script lang="ts">
	import type { GuessKind, Region } from '$lib/types';

	let {
		kind,
		regions,
		disabled = false,
		onpick
	}: {
		kind: GuessKind;
		regions: Record<string, Region>;
		disabled?: boolean;
		onpick: (answer: { cc?: string; admin1?: string }) => void;
	} = $props();

	let query = $state('');

	/**
	 * Las opciones salen de regions.json: los paises por id, las provincias por
	 * nombre, que es exactamente lo que guarda cada ubicacion del pool.
	 */
	const options = $derived(
		Object.values(regions)
			.filter((r) => (kind === 'admin1' ? r.kind === 'admin1' || r.kind === 'city' : r.kind === 'country'))
			.sort((a, b) => a.name.localeCompare(b.name, 'es'))
	);

	const shown = $derived(
		options.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
	);

	function choose(region: Region) {
		if (disabled) return;
		onpick(kind === 'admin1' ? { admin1: region.name } : { cc: region.id });
	}
</script>

<div class="flex h-full flex-col gap-2 p-3">
	<input
		bind:value={query}
		{disabled}
		placeholder={kind === 'admin1' ? 'Buscar provincia…' : 'Buscar país…'}
		class="w-full rounded border border-border bg-bg-primary px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none"
	/>
	<div class="flex-1 overflow-y-auto">
		{#each shown as region (region.id)}
			<button
				onclick={() => choose(region)}
				{disabled}
				class="block w-full px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary disabled:opacity-40"
			>
				{region.name}
			</button>
		{:else}
			<p class="px-3 py-2 text-sm text-text-muted">Nada con ese nombre.</p>
		{/each}
	</div>
</div>
