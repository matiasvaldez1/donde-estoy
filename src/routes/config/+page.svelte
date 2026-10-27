<script lang="ts">
	import { settings } from '$lib/stores/settings.svelte';
	import { stats } from '$lib/stores/stats.svelte';
	import { exportAll, importAll } from '$lib/stores/persist';
	import { hasKey, panoDriver } from '$lib/streetview/pano';

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
		stats.reset();
		message = 'Estadísticas borradas.';
	}
</script>

<div class="mx-auto max-w-2xl space-y-8">
	<h1 class="text-2xl font-semibold text-text-primary">Configuración</h1>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-text-primary">Mapa</h2>
		<label class="flex items-center gap-3 text-sm text-text-secondary">
			<input
				type="checkbox"
				checked={settings.current.mapLabels}
				onchange={(e) => settings.setMapLabels(e.currentTarget.checked)}
				class="accent-accent"
			/>
			Mostrar nombres en el mapa de respuesta
		</label>
		<p class="text-xs text-text-muted">
			Apagarlo lo hace bastante más difícil: te quedás sin los nombres de ciudades como pista.
		</p>
	</section>

	<section class="space-y-2">
		<h2 class="text-lg font-semibold text-text-primary">Google Maps</h2>
		<p class="text-sm text-text-secondary">
			Driver: <code>{panoDriver()}</code> · Clave:
			{#if hasKey()}
				<span class="text-accent">configurada</span>
			{:else}
				<span class="text-danger">falta</span>
			{/if}
		</p>
		<p class="text-sm text-text-secondary">Panoramas cargados hoy: {stats.panosToday}</p>
		<p class="text-xs text-text-muted">
			El plan gratuito da 10.000 cargas por mes. Poné un tope diario de cuota en Cloud console y
			no hay forma de que te facturen.
		</p>
	</section>

	<section class="space-y-3">
		<h2 class="text-lg font-semibold text-text-primary">Datos</h2>
		<div class="flex flex-wrap gap-3">
			<button
				onclick={download}
				class="rounded border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
			>
				Exportar JSON
			</button>
			<label class="cursor-pointer rounded border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover">
				Importar JSON
				<input type="file" accept="application/json" onchange={upload} class="hidden" />
			</label>
			<button
				onclick={reset}
				class="rounded border border-danger/40 px-4 py-2 text-sm text-danger hover:bg-danger/10"
			>
				Borrar estadísticas
			</button>
		</div>
		{#if message}
			<p class="text-sm text-accent">{message}</p>
		{/if}
	</section>
</div>
