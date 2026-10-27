import { mulberry32, pick, seededRng, shuffle, weightedIndex, xmur3 } from '../src/lib/game/rng';

describe('rng determinista', () => {
	it('la misma semilla da la misma secuencia', () => {
		const a = seededRng('2026-10-27');
		const b = seededRng('2026-10-27');
		const seqA = [a(), a(), a(), a(), a()];
		const seqB = [b(), b(), b(), b(), b()];
		expect(seqA).toEqual(seqB);
	});

	it('semillas distintas dan secuencias distintas', () => {
		const a = seededRng('2026-10-27');
		const b = seededRng('2026-10-28');
		expect([a(), a(), a()]).not.toEqual([b(), b(), b()]);
	});

	it('se queda en [0, 1)', () => {
		const rng = mulberry32(xmur3('x')());
		for (let i = 0; i < 1000; i++) {
			const v = rng();
			expect(v).toBeGreaterThanOrEqual(0);
			expect(v).toBeLessThan(1);
		}
	});
});

describe('helpers de rng', () => {
	it('shuffle no pierde ni duplica elementos', () => {
		const items = [1, 2, 3, 4, 5, 6, 7, 8];
		const out = shuffle(items, seededRng('s'));
		expect(out.slice().sort((a, b) => a - b)).toEqual(items);
		expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
	});

	it('pick devuelve un elemento de la lista', () => {
		expect([10, 20, 30]).toContain(pick([10, 20, 30], seededRng('p')));
	});

	it('weightedIndex respeta los pesos', () => {
		const rng = seededRng('w');
		const counts = [0, 0, 0];
		for (let i = 0; i < 3000; i++) counts[weightedIndex([1, 0, 9], rng)]++;
		expect(counts[1]).toBe(0);
		expect(counts[2]).toBeGreaterThan(counts[0] * 4);
	});

	it('con pesos en cero no se cuelga', () => {
		expect(weightedIndex([0, 0], seededRng('z'))).toBeGreaterThanOrEqual(0);
	});
});
