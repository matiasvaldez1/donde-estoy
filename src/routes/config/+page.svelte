<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { stats } from '$lib/stores/stats.svelte';
	import { exportAll, importAll } from '$lib/stores/persist';
	import { hasKey, panoDriver } from '$lib/streetview/pano';
	import Button from '$lib/ui/Button.svelte';
	import Heading from '$lib/ui/Heading.svelte';
	import PageShell from '$lib/ui/PageShell.svelte';

	$effect(() => {
		settings.load();
		stats.load();
	});

	let message = $state('');

	function download() {
		const blob = new Blob([exportAll()], { type: 'application/json' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `donde-estoy-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	async function upload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		try {
			importAll(await file.text());
			stats.load();
			settings.load();
			message = 'Datos importados.';
		} catch {
			message = 'Ese archivo no se pudo leer.';
		}
		input.value = '';
	}

	function reset() {
		if (!confirm('¿Borrar todas las estadísticas? No se puede deshacer.')) return;
		stats.reset();
		message = 'Estadísticas borradas.';
	}
</script>

<PageShell width="max-w-2xl">
	<Heading level={1}>Configuración</Heading>

	<section class="space-y-3">
		<Heading>Mapa</Heading>
		<label class="flex items-center gap-3 text-text-secondary">
			<input
				type="checkbox"
				class="nes-checkbox is-dark"
				checked={settings.current.mapLabels}
				onchange={(e) => settings.setMapLabels(e.currentTarget.checked)}
			/>
			<span>Mostrar nombres en el mapa de respuesta</span>
		</label>
		<p class="text-text-muted">
			Apagarlo lo hace bastante más difícil: te quedás sin los nombres de ciudades como pista.
		</p>
	</section>

	<section class="space-y-3">
		<Heading>Google Maps</Heading>
		<p class="text-text-secondary">
			Clave:
			{#if hasKey()}
				<span class="text-accent">configurada</span>
			{:else}
				<span class="text-danger">falta</span>
			{/if}
			{#if import.meta.env.DEV}
				· driver <code>{panoDriver()}</code> · {stats.panosToday} panoramas hoy
			{/if}
		</p>
		{#if import.meta.env.DEV}
			<p class="text-text-muted">
				El plan gratuito da 5.000 cargas por mes (SKU Pro). Poné un tope diario de ~150 en Cloud
				console y no hay forma de que te facturen.
			</p>
		{/if}
	</section>

	<section class="space-y-4">
		<Heading>Datos</Heading>
		<div class="flex flex-wrap gap-3">
			<Button onclick={download}>Exportar</Button>
			<label class="nes-btn press cursor-pointer font-display text-[10px] leading-none">
				Importar
				<input type="file" accept="application/json" onchange={upload} class="hidden" />
			</label>
			<Button variant="danger" onclick={reset}>Borrar</Button>
		</div>
		{#if message}
			<p class="text-accent">{message}</p>
		{/if}
	</section>
</PageShell>
