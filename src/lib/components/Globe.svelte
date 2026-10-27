<script lang="ts">
	import type { RoundResult } from '$lib/types';
	import { themeColor } from '$lib/ui/theme';

	let {
		result = undefined,
		ambient = false,
		onfail = undefined
	}: {
		/** Resultado a dibujar: arco de tu respuesta al lugar real. */
		result?: RoundResult;
		/** Modo decorativo: gira solo y no recibe clicks. */
		ambient?: boolean;
		onfail?: () => void;
	} = $props();

	let host: HTMLDivElement;

	/*
	 * Se renderiza chico y se agranda con image-rendering: pixelated. Es el
	 * truco que hace que un globo 3D no desentone con el resto: píxeles gordos
	 * de verdad, no un globo corporativo suavizado.
	 */
	const SCALE = ambient ? 3 : 2;

	$effect(() => {
		const target = result;
		let cancelled = false;
		let world: { _destructor?: () => void; pauseAnimation?: () => void } | null = null;

		/* three.js pesa 1,8 MB. Para un globo puramente decorativo eso no se le
		   cobra a quien pidió menos movimiento o está ahorrando datos. */
		if (ambient) {
			const saveData = (navigator as { connection?: { saveData?: boolean } }).connection?.saveData;
			const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
			if (saveData || quieto) return;
		}

		(async () => {
			try {
				const [mod, countries] = await Promise.all([
					import('globe.gl'),
					fetch('/data/globe/countries.json').then((r) => {
						if (!r.ok) throw new Error('sin geometría del globo');
						return r.json();
					})
				]);
				if (cancelled || !host) return;

				const rect = host.getBoundingClientRect();
				const w = Math.max(90, Math.round(rect.width / SCALE));
				const h = Math.max(90, Math.round(rect.height / SCALE));

				const Globe = (mod.default ?? mod) as unknown as (
					opts?: Record<string, unknown>
				) => (el: HTMLElement) => Record<string, (...args: unknown[]) => unknown>;

				const g = Globe({ animateIn: false, rendererConfig: { antialias: false, alpha: true } })(
					host
				) as Record<string, (...args: unknown[]) => unknown> & {
					renderer: () => { setPixelRatio: (n: number) => void };
					globeMaterial: () => { color: { set: (c: string) => void } };
					controls: () => { autoRotate: boolean; autoRotateSpeed: number; enabled: boolean };
				};
				world = g as unknown as typeof world;

				const ink = themeColor('--color-bg-primary', '#0f0f0f');
				const land = themeColor('--color-bg-tertiary', '#252525');
				const accent = themeColor('--color-accent', '#4ade80');
				const line = themeColor('--color-warning', '#f7d51d');
				const guessColor = themeColor('--color-text-primary', '#e5e5e5');

				g.width(w);
				g.height(h);
				g.backgroundColor('rgba(0,0,0,0)');
				g.showAtmosphere(true);
				g.atmosphereColor(accent);
				g.atmosphereAltitude(0.12);
				g.polygonsData(countries.features);
				g.polygonCapColor(() => land);
				g.polygonStrokeColor(() => accent);
				g.polygonSideColor(() => 'rgba(0,0,0,0)');
				g.polygonStrokeColor(() => accent);
				g.polygonAltitude(0.006);
				g.renderer().setPixelRatio(1);
				g.globeMaterial().color.set(ink);

				const controls = g.controls();
				controls.enabled = !ambient;

				if (ambient) {
					controls.autoRotate = true;
					controls.autoRotateSpeed = 0.35;
					g.pointOfView({ lat: -30, lng: -60, altitude: 2.4 }, 0);
					return;
				}

				if (!target) return;
				const truth = target.location;
				const guess = target.guess;
				const pin =
					guess?.lat !== undefined && guess.lng !== undefined
						? { lat: guess.lat, lng: guess.lng }
						: null;

				g.pointsData(
					pin
						? [
								{ lat: pin.lat, lng: pin.lng, color: guessColor },
								{ lat: truth.lat, lng: truth.lng, color: accent }
							]
						: [{ lat: truth.lat, lng: truth.lng, color: accent }]
				);
				g.pointColor((d: unknown) => (d as { color: string }).color);
				g.pointAltitude(0.06);
				g.pointRadius(1.6);

				if (pin) {
					g.arcsData([
						{ startLat: pin.lat, startLng: pin.lng, endLat: truth.lat, endLng: truth.lng }
					]);
					g.arcColor(() => line);
					g.arcStroke(1.1);
					g.arcDashLength(0.4);
					g.arcDashGap(0.2);
					g.arcDashAnimateTime(1200);
					g.arcAltitudeAutoScale(0.4);

					// Arranca sobre tu respuesta y viaja hasta el punto medio.
					g.pointOfView({ lat: pin.lat, lng: pin.lng, altitude: 0.9 }, 0);
					const km = target.distanceKm ?? 0;
					const altitude = Math.min(2.2, Math.max(0.28, km / 9000 + 0.3));
					setTimeout(() => {
						if (!cancelled) {
							g.pointOfView(
								{ lat: (pin.lat + truth.lat) / 2, lng: (pin.lng + truth.lng) / 2, altitude },
								1200
							);
						}
					}, 200);
				} else {
					g.pointOfView({ lat: truth.lat, lng: truth.lng, altitude: 0.9 }, 0);
				}
			} catch {
				if (!cancelled) onfail?.();
			}
		})();

		return () => {
			cancelled = true;
			world?.pauseAnimation?.();
			world?._destructor?.();
			if (host) host.innerHTML = '';
		};
	});
</script>

<div bind:this={host} class="pixel-globe h-full w-full overflow-hidden"></div>
