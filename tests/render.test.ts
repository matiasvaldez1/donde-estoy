// @vitest-environment happy-dom
import { flushSync, mount, unmount } from 'svelte';
import Hud from '../src/lib/components/Hud.svelte';
import Timer from '../src/lib/components/Timer.svelte';
import { initialState } from '../src/lib/game/engine';
import { resolveConstraints } from '../src/lib/game/ladder';
import { clasica } from '../src/lib/game/modes/clasica';
import { escalera } from '../src/lib/game/modes/escalera';
import { REGIONS } from './helpers';

beforeEach(() => {
	vi.stubGlobal('localStorage', {
		getItem: () => null,
		setItem: () => {},
		removeItem: () => {}
	});
});

/**
 * Montar de verdad: si un $effect se retroalimenta, Svelte tira
 * effect_update_depth_exceeded y el test lo caza acá, sin navegador.
 */
function mountIt(component: never, props: Record<string, unknown>) {
	const target = document.createElement('div');
	document.body.appendChild(target);
	const instance = mount(component, { target, props });
	flushSync();
	return { instance, target };
}

describe('Hud', () => {
	it('se monta sin ciclo de efectos', () => {
		const state = initialState(clasica, 'ar');
		const constraints = resolveConstraints(clasica, state, REGIONS);
		const { instance, target } = mountIt(Hud as never, {
			mode: clasica,
			state,
			region: REGIONS.ar,
			constraints,
			startedAt: Date.now(),
			onexpire: () => {}
		});
		expect(target.textContent).toContain('Clásica');
		unmount(instance);
	});

	it('muestra los candados de la escalera', () => {
		const state = { ...initialState(escalera, 'ar'), tier: 4 };
		const constraints = resolveConstraints(escalera, state, REGIONS);
		const { instance, target } = mountIt(Hud as never, {
			mode: escalera,
			state,
			region: REGIONS.latam,
			constraints,
			startedAt: Date.now(),
			onexpire: () => {}
		});
		expect(target.textContent).toContain('sin girar');
		expect(target.textContent).toContain('sin moverse');
		unmount(instance);
	});
});

describe('Timer', () => {
	it('sin límite de tiempo no renderiza nada ni se cuelga', () => {
		const { instance, target } = mountIt(Timer as never, {
			limitSec: null,
			startedAt: Date.now(),
			onexpire: () => {}
		});
		expect(target.textContent?.trim()).toBe('');
		unmount(instance);
	});

	it('cuenta para abajo y avisa al expirar', async () => {
		vi.useFakeTimers();
		let expired = false;
		const { instance, target } = mountIt(Timer as never, {
			limitSec: 1,
			startedAt: Date.now(),
			onexpire: () => (expired = true)
		});
		expect(target.textContent).toContain('0:01');
		vi.advanceTimersByTime(1400);
		flushSync();
		expect(expired).toBe(true);
		unmount(instance);
		vi.useRealTimers();
	});
});
