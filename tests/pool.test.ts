import { readFileSync } from 'node:fs';
import {
	candidates,
	decodeShard,
	loadPool,
	loadShard,
	locationId,
	pickLocation,
	pickSeries
} from '../src/lib/data/pool';
import type { PoolShard } from '../src/lib/data/pool';
import { seededRng } from '../src/lib/game/rng';
import type { GameLocation } from '../src/lib/types';

const shard: PoolShard = {
	version: 1,
	source: 'seed',
	admin1: ['Mendoza', 'Salta'],
	rows: [
		[-32.8895, -68.8458, 'pano1', 'ar', 0, '2023-01', 20, 10, 16, 90],
		[-24.7859, -65.4117, null, 'ar', 1, '2022-05', 50, 50, 1, null],
		[-32.5, -68.0, null, 'ar', 0, '2021-03', 80, 90, 1, 270]
	]
};

function fakePool(pcts: number[]): GameLocation[] {
	return pcts.map((pct, i) => ({
		id: `l${i}`,
		lat: -34 - i,
		lng: -58 - i,
		panoId: null,
		cc: 'ar',
		admin1: 'Buenos Aires',
		ym: '2023-01',
		diff: pct,
		pct,
		tags: 0,
		heading: null
	}));
}

describe('decodeShard', () => {
	it('expande el formato columnar', () => {
		const locs = decodeShard(shard);
		expect(locs.length).toBe(3);
		expect(locs[0].admin1).toBe('Mendoza');
		expect(locs[0].panoId).toBe('pano1');
		expect(locs[1].admin1).toBe('Salta');
		expect(locs[1].panoId).toBeNull();
		expect(locs[1].heading).toBeNull();
		expect(locs[2].heading).toBe(270);
	});

	it('tolera un indice de provincia fuera de tabla', () => {
		const roto = { ...shard, rows: [[...shard.rows[0]]] as PoolShard['rows'] };
		roto.rows[0][4] = 99;
		expect(decodeShard(roto)[0].admin1).toBe('');
	});
});

describe('locationId', () => {
	it('es estable para la misma coordenada', () => {
		expect(locationId(-34.6037, -58.3816)).toBe(locationId(-34.6037, -58.3816));
	});

	it('cambia con la coordenada', () => {
		expect(locationId(-34.6037, -58.3816)).not.toBe(locationId(-34.6038, -58.3816));
	});

	it('no depende del panoId, que caduca', () => {
		const conPano = decodeShard(shard)[0];
		const sinPano = decodeShard({ ...shard, rows: [[...shard.rows[0]]] as PoolShard['rows'] });
		sinPano[0].panoId = null;
		expect(conPano.id).toBe(sinPano[0].id);
	});
});

describe('candidates', () => {
	it('filtra por ventana de percentil', () => {
		const pool = fakePool([5, 20, 45, 70, 95]);
		const hit = candidates(pool, [0, 50], new Set(), 1);
		expect(hit.map((l) => l.pct)).toEqual([5, 20, 45]);
	});

	it('ensancha la ventana cuando no alcanza para elegir', () => {
		const pool = fakePool([5, 10, 15, 90, 95]);
		const hit = candidates(pool, [40, 60], new Set(), 3);
		expect(hit.length).toBeGreaterThanOrEqual(3);
	});

	it('excluye las ya vistas', () => {
		const pool = fakePool([10, 20, 30, 40, 50, 60]);
		const hit = candidates(pool, [0, 100], new Set(['l0', 'l1']), 1);
		expect(hit.map((l) => l.id)).not.toContain('l0');
		expect(hit.map((l) => l.id)).not.toContain('l1');
	});

	it('si excluirlas no deja nada, repite antes que quedarse sin ronda', () => {
		const pool = fakePool([10, 20]);
		const hit = candidates(pool, [0, 100], new Set(['l0', 'l1']), 1);
		expect(hit.length).toBeGreaterThan(0);
	});

	it('con pool vacio devuelve vacio', () => {
		expect(candidates([], [0, 100])).toEqual([]);
	});
});

describe('pickLocation y pickSeries', () => {
	it('con la misma semilla elige lo mismo', () => {
		const pool = fakePool([10, 20, 30, 40, 50]);
		const a = pickLocation(pool, [0, 100], seededRng('2026-10-27'));
		const b = pickLocation(pool, [0, 100], seededRng('2026-10-27'));
		expect(a?.id).toBe(b?.id);
	});

	it('pickSeries no repite ubicaciones', () => {
		const pool = fakePool([10, 20, 30, 40, 50, 60, 70]);
		const serie = pickSeries(pool, [0, 100], seededRng('d'), 5);
		expect(serie.length).toBe(5);
		expect(new Set(serie.map((l) => l.id)).size).toBe(5);
	});

	it('pickSeries no inventa mas de lo que hay', () => {
		const serie = pickSeries(fakePool([10, 20]), [0, 100], seededRng('d'), 5);
		expect(serie.length).toBe(2);
	});

	it('el desafio diario es identico para la misma fecha', () => {
		const pool = fakePool([10, 20, 30, 40, 50, 60, 70, 80]);
		const uno = pickSeries(pool, [0, 100], seededRng('2026-10-27'), 5).map((l) => l.id);
		const otro = pickSeries(pool, [0, 100], seededRng('2026-10-27'), 5).map((l) => l.id);
		const otroDia = pickSeries(pool, [0, 100], seededRng('2026-10-28'), 5).map((l) => l.id);
		expect(uno).toEqual(otro);
		expect(uno).not.toEqual(otroDia);
	});

	it('devuelve null con pool vacio', () => {
		expect(pickLocation([], [0, 100], seededRng('x'))).toBeNull();
	});
});

describe('carga de shards', () => {
	it('lee el shard por fetch y cachea la promesa', async () => {
		let llamadas = 0;
		const fakeFetch = (async (url: string) => {
			llamadas++;
			expect(url).toBe('/data/pool/test-cache.json');
			return { ok: true, json: async () => shard };
		}) as unknown as typeof fetch;

		const uno = await loadShard('test-cache.json', fakeFetch);
		const dos = await loadShard('test-cache.json', fakeFetch);
		expect(uno.length).toBe(3);
		expect(dos).toBe(uno);
		expect(llamadas).toBe(1);
	});

	it('avisa cuando falta el shard y no deja cache envenenada', async () => {
		const fakeFetch = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
		await expect(loadShard('falta.json', fakeFetch)).rejects.toThrow('Shard faltante');
		await expect(loadShard('falta.json', fakeFetch)).rejects.toThrow('Shard faltante');
	});

	it('junta varios shards en un pool', async () => {
		const fakeFetch = (async () => ({ ok: true, json: async () => shard })) as unknown as typeof fetch;
		const pool = await loadPool(['a.json', 'b.json'], fakeFetch);
		expect(pool.length).toBe(6);
	});
});

describe('pool semilla commiteado', () => {
	const file: PoolShard = JSON.parse(readFileSync('static/data/pool/ar.json', 'utf8'));
	const locs = decodeShard(file);

	it('viene marcado como semilla, no como horneado', () => {
		expect(file.source).toBe('seed');
	});

	it('todas las ubicaciones caen dentro de la bbox de Argentina', () => {
		const [w, s, e, n] = [-73.6, -55.1, -53.6, -21.8];
		for (const loc of locs) {
			expect(loc.lng).toBeGreaterThanOrEqual(w);
			expect(loc.lng).toBeLessThanOrEqual(e);
			expect(loc.lat).toBeGreaterThanOrEqual(s);
			expect(loc.lat).toBeLessThanOrEqual(n);
		}
	});

	it('no tiene coordenadas repetidas', () => {
		expect(new Set(locs.map((l) => l.id)).size).toBe(locs.length);
	});

	it('alcanza el piso para que Argentina sea jugable', () => {
		expect(locs.length).toBeGreaterThanOrEqual(20);
	});

	it('cubre percentiles variados para que la escalera tenga de donde elegir', () => {
		expect(Math.min(...locs.map((l) => l.pct))).toBeLessThan(30);
		expect(Math.max(...locs.map((l) => l.pct))).toBeGreaterThan(70);
	});
});
