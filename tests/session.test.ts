import { readFileSync } from 'node:fs';
import { Session } from '../src/lib/stores/session.svelte';
import { clasica } from '../src/lib/game/modes/clasica';
import { escalera } from '../src/lib/game/modes/escalera';

/** Sirve los JSON estáticos desde disco, como lo haría el servidor. */
function diskFetch(): typeof fetch {
	return (async (url: string) => {
		const path = `static${url}`;
		try {
			const body = readFileSync(path, 'utf8');
			return { ok: true, json: async () => JSON.parse(body) };
		} catch {
			return { ok: false, json: async () => ({}) };
		}
	}) as unknown as typeof fetch;
}

beforeEach(() => {
	vi.stubGlobal('fetch', diskFetch());
	vi.stubGlobal('localStorage', {
		getItem: () => null,
		setItem: () => {},
		removeItem: () => {}
	});
});

describe('Session con los datos reales del repo', () => {
	it('arranca una ronda clásica sin colgarse', async () => {
		const session = new Session(clasica, 'ar');
		await session.init();

		expect(session.error).toBeNull();
		expect(session.loading).toBe(false);
		expect(session.state.status).toBe('playing');
		expect(session.state.current?.location.cc).toBe('ar');
		expect(session.region?.id).toBe('ar');
	}, 5000);

	it('la escalera no sale de lo horneado', async () => {
		const session = new Session(escalera, 'ar');
		await session.init();
		expect(session.state.current?.constraints.regionId).toBe('ar');
	}, 5000);

	it('avisa cuando la región no tiene ningún shard horneado', async () => {
		const session = new Session(clasica, 'cl');
		await session.init();
		expect(session.error).toBeTruthy();
		expect(session.state.current).toBeNull();
	}, 5000);

	it('juega cinco rondas enteras', async () => {
		const session = new Session(clasica, 'ar');
		await session.init();
		for (let i = 0; i < 5; i++) {
			const loc = session.state.current!.location;
			session.submit({ lat: loc.lat, lng: loc.lng, elapsedSec: 2, timedOut: false });
			if (i < 4) await session.next();
		}
		expect(session.state.status).toBe('over');
		expect(session.state.totalScore).toBe(25_000);
	}, 10000);
});
