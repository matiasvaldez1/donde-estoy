/**
 * Genera el mundo de baja resolución que usa el globo 3D.
 *
 * Natural Earth 110m, sin propiedades y con coordenadas redondeadas a un
 * decimal: queda anguloso a propósito, que es justo lo que pide el estilo
 * pixel, y pesa poco. Sin texturas externas ni CDNs.
 *
 *   pnpm tsx scripts/make-globe-geo.ts
 */
import { mkdirSync, writeFileSync } from 'node:fs';

const URL_110M =
	'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson';

type Pos = [number, number];

function roundRing(ring: Pos[]): Pos[] {
	const out: Pos[] = [];
	for (const [lng, lat] of ring) {
		const p: Pos = [Math.round(lng * 10) / 10, Math.round(lat * 10) / 10];
		const last = out[out.length - 1];
		// Tras redondear quedan puntos repetidos: no aportan nada.
		if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
	}
	if (out.length < 4) return ring.map(([a, b]) => [a, b] as Pos);
	return out;
}

function roundGeometry(geometry: { type: string; coordinates: unknown }): typeof geometry {
	if (geometry.type === 'Polygon') {
		return { type: 'Polygon', coordinates: (geometry.coordinates as Pos[][]).map(roundRing) };
	}
	if (geometry.type === 'MultiPolygon') {
		return {
			type: 'MultiPolygon',
			coordinates: (geometry.coordinates as Pos[][][]).map((poly) => poly.map(roundRing))
		};
	}
	return geometry;
}

async function main(): Promise<void> {
	console.log('bajando Natural Earth 110m…');
	const res = await fetch(URL_110M);
	if (!res.ok) throw new Error(`No se pudo bajar: ${res.status}`);
	const raw = (await res.json()) as {
		features: Array<{ properties: Record<string, unknown>; geometry: { type: string; coordinates: unknown } | null }>;
	};

	const features = raw.features
		.filter((f) => f.geometry)
		.map((f) => ({
			type: 'Feature' as const,
			// Solo el ISO2: alcanza para resaltar el país de la respuesta.
			properties: { cc: String(f.properties.ISO_A2 ?? f.properties.iso_a2 ?? '').toLowerCase() },
			geometry: roundGeometry(f.geometry!)
		}));

	mkdirSync('static/data/globe', { recursive: true });
	const out = { type: 'FeatureCollection', features };
	const json = JSON.stringify(out);
	writeFileSync('static/data/globe/countries.json', json + '\n');
	console.log(`countries.json: ${features.length} países · ${(json.length / 1024).toFixed(0)} KB`);
}

main().catch((err) => {
	console.error(err instanceof Error ? err.message : err);
	process.exit(1);
});
