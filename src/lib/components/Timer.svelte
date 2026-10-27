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
	<span class="font-mono text-sm {left <= 10 ? 'text-danger' : 'text-text-secondary'}">
		{formatClock(left)}
	</span>
{/if}
