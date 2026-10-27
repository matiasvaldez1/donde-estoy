/** Hash de cadena a semilla de 32 bits (xmur3). */
export function xmur3(str: string): () => number {
	let h = 1779033703 ^ str.length;
	for (let i = 0; i < str.length; i++) {
		h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
		h = (h << 13) | (h >>> 19);
	}
	return () => {
		h = Math.imul(h ^ (h >>> 16), 2246822507);
		h = Math.imul(h ^ (h >>> 13), 3266489909);
		h ^= h >>> 16;
		return h >>> 0;
	};
}

export type Rng = () => number;

/** PRNG determinista de 32 bits (mulberry32). */
export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function seededRng(seed: string): Rng {
	return mulberry32(xmur3(seed)());
}

export function randomRng(): Rng {
	return Math.random;
}

export function pick<T>(items: readonly T[], rng: Rng): T {
	return items[Math.floor(rng() * items.length)];
}

/** Fisher-Yates sobre una copia. */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
	const out = items.slice();
	for (let i = out.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[out[i], out[j]] = [out[j], out[i]];
	}
	return out;
}

/** Indice elegido con probabilidad proporcional a su peso. */
export function weightedIndex(weights: readonly number[], rng: Rng): number {
	const total = weights.reduce((a, b) => a + b, 0);
	if (total <= 0) return Math.floor(rng() * weights.length);
	let r = rng() * total;
	for (let i = 0; i < weights.length; i++) {
		r -= weights[i];
		if (r <= 0) return i;
	}
	return weights.length - 1;
}
