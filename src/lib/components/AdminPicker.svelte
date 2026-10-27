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
	let cursor = $state(0);
	let listEl: HTMLDivElement;

	/**
	 * Las opciones salen de regions.json: los países por id, las provincias por
	 * nombre, que es exactamente lo que guarda cada ubicación del pool.
	 */
	const options = $derived(
		Object.values(regions)
			.filter((r) =>
				kind === 'admin1' ? r.kind === 'admin1' || r.kind === 'city' : r.kind === 'country'
			)
			.sort((a, b) => a.name.localeCompare(b.name, 'es'))
	);

	const shown = $derived(
		options.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
	);

	function choose(region: Region) {
		if (disabled) return;
		onpick(kind === 'admin1' ? { admin1: region.name } : { cc: region.id });
	}

	/* Antes había que tipear y después ir al mouse: con 200 países eso es cruel. */
	function onKey(event: KeyboardEvent) {
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			cursor = Math.min(cursor + 1, shown.length - 1);
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			cursor = Math.max(cursor - 1, 0);
		} else if (event.key === 'Enter') {
			event.preventDefault();
			event.stopPropagation();
			if (shown[cursor]) choose(shown[cursor]);
		}
	}

	$effect(() => {
		void query;
		cursor = 0;
	});

	$effect(() => {
		const el = listEl?.children[cursor] as HTMLElement | undefined;
		el?.scrollIntoView({ block: 'nearest' });
	});
</script>

<div class="flex h-full flex-col gap-2 p-2">
	<!-- svelte-ignore a11y_autofocus -->
	<input
		bind:value={query}
		onkeydown={onKey}
		{disabled}
		autofocus
		placeholder={kind === 'admin1' ? 'Buscar provincia…' : 'Buscar país…'}
		class="w-full border-4 border-border bg-bg-primary px-3 py-2 text-text-primary placeholder:text-text-muted focus:border-accent"
	/>
	<div bind:this={listEl} class="min-h-0 flex-1 overflow-y-auto">
		{#each shown as region, i (region.id)}
			<button
				onclick={() => choose(region)}
				{disabled}
				class="block w-full px-3 py-2 text-left transition-none disabled:opacity-40 {i === cursor
					? 'bg-accent text-bg-primary'
					: 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'}"
			>
				{region.name}
			</button>
		{:else}
			<p class="px-3 py-2 text-text-muted">Nada con ese nombre.</p>
		{/each}
	</div>
	<p class="px-1 font-display text-[8px] text-text-muted">↑↓ elegir · Enter confirma</p>
</div>
