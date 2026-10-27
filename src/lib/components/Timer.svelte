<script lang="ts">
	import { formatClock } from '$lib/utils';

	let {
		limitSec,
		startedAt,
		onexpire
	}: {
		limitSec: number | null;
		startedAt: number;
		onexpire: () => void;
	} = $props();

	let left = $state(0);

	/** Bloques discretos que se van apagando: el reloj se ve, no solo se lee. */
	const BLOCKS = 10;
	const filled = $derived(
		limitSec ? Math.ceil((left / limitSec) * BLOCKS) : 0
	);
	const urgent = $derived(left <= 10);

	$effect(() => {
		if (limitSec === null) return;
		const limit = limitSec;
		const from = startedAt;
		let fired = false;
		left = limit;
		const id = setInterval(() => {
			const remaining = limit - (Date.now() - from) / 1000;
			left = Math.max(0, remaining);
			if (remaining <= 0 && !fired) {
				fired = true;
				clearInterval(id);
				onexpire();
			}
		}, 200);
		return () => clearInterval(id);
	});
</script>

{#if limitSec !== null}
	<span class="flex items-center gap-2" class:animate-pulse={urgent}>
		<span class="flex gap-[2px]" aria-hidden="true">
			{#each Array(BLOCKS) as _, i}
				<span
					class="h-3 w-[5px] {i < filled
						? urgent
							? 'bg-danger'
							: 'bg-accent'
						: 'bg-bg-tertiary'}"
				></span>
			{/each}
		</span>
		<span
			class="font-display text-[10px] leading-none {urgent ? 'text-danger' : 'text-text-secondary'}"
		>
			{formatClock(left)}
		</span>
	</span>
{/if}
