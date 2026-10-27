import { fileURLToPath } from 'node:url';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	// El plugin compila los .svelte y .svelte.ts, para poder montar componentes
	// y testear los stores con runes sin navegador.
	plugins: [svelte({ hot: false })],
	resolve: {
		conditions: ['browser'],
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url))
		}
	},
	test: {
		globals: true,
		include: ['tests/**/*.test.ts']
	}
});
