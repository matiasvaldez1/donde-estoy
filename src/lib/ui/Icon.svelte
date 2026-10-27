<script lang="ts">
	import { iconRects, type IconName } from './icons';

	let {
		name,
		size = 16,
		label,
		class: klass = ''
	}: {
		name: IconName;
		/** Múltiplo de 8 para que cada pixel caiga entero. */
		size?: number;
		/** Si falta, el icono es decorativo y se oculta a los lectores de pantalla. */
		label?: string;
		class?: string;
	} = $props();

	const rects = $derived(iconRects(name));
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 8 8"
	class="inline-block shrink-0 {klass}"
	style="shape-rendering: crispEdges;"
	role={label ? 'img' : 'presentation'}
	aria-label={label}
	aria-hidden={label ? undefined : 'true'}
>
	{#each rects as [x, y]}
		<rect {x} {y} width="1" height="1" fill="currentColor" />
	{/each}
</svg>
