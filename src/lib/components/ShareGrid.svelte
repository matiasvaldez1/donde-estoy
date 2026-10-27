<script lang="ts">
	import { formatScore } from '$lib/utils';

	let {
		number,
		total,
		grid,
		max
	}: {
		number: number;
		total: number;
		grid: string;
		max: number;
	} = $props();

	let copied = $state(false);

	const text = $derived(
		`¿Dónde Estoy? #${number} — ${formatScore(total)}/${formatScore(max)}\n${grid}`
	);

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		} catch {
			copied = false;
		}
	}
</script>

<div class="rounded border border-border bg-bg-secondary p-4">
	<pre class="mb-3 font-mono text-sm whitespace-pre-wrap text-text-primary">{text}</pre>
	<button
		onclick={copy}
		class="rounded bg-accent px-3 py-1.5 text-sm font-medium text-bg-primary transition-colors hover:bg-accent-hover"
	>
		{copied ? 'Copiado' : 'Copiar resultado'}
	</button>
</div>
