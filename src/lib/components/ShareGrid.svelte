<script lang="ts">
	import { formatScore } from '$lib/utils';
	import Button from '$lib/ui/Button.svelte';

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

<div class="nes-container is-dark space-y-3">
	<pre class="text-lg whitespace-pre-wrap text-text-primary">{text}</pre>
	<Button variant={copied ? 'primary' : 'secondary'} onclick={copy}>
		{copied ? 'Copiado' : 'Copiar resultado'}
	</Button>
</div>
