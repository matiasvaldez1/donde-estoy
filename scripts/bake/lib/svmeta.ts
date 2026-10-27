import { cacheKey, readCache, writeCache } from './cache.ts';

/**
 * Metadata de Street View: gratis y sin cuota. Es el unico paso que necesita
 * la clave de Google, y nunca descarga pixeles.
 */
export interface SvMetadata {
	status: 'OK' | 'ZERO_RESULTS' | 'NOT_FOUND' | 'OVER_QUERY_LIMIT' | 'REQUEST_DENIED' | 'INVALID_REQUEST';
	pano_id?: string;
	location?: { lat: number; lng: number };
	date?: string;
	copyright?: string;
}

const ENDPOINT = 'https://maps.googleapis.com/maps/api/streetview/metadata';

export interface SvResult {
	ok: boolean;
	panoId?: string;
	lat?: number;
	lng?: number;
	ym?: string;
	reason?: string;
}

/**
 * Solo cobertura oficial del auto de Google: el copyright que no dice "Google"
 * es una photosphere de usuario, con otra altura, otra camara y otra calidad.
 */
export function isOfficial(meta: SvMetadata): boolean {
	return meta.status === 'OK' && !!meta.copyright && /google/i.test(meta.copyright);
}

export async function lookup(
	lat: number,
	lng: number,
	key: string,
	radius: number,
	cacheDir: string
): Promise<SvResult> {
	const url = `${ENDPOINT}?location=${lat.toFixed(6)},${lng.toFixed(6)}&radius=${radius}&source=outdoor&key=${key}`;
	const path = `${cacheDir}/${cacheKey(`${lat.toFixed(5)},${lng.toFixed(5)},${radius}`)}.json`;

	const cached = readCache<SvMetadata>(path);
	const meta = cached ?? (await request(url));
	if (!cached && meta.status !== 'OVER_QUERY_LIMIT') writeCache(path, meta);

	if (!isOfficial(meta)) {
		return { ok: false, reason: meta.status === 'OK' ? 'photosphere' : meta.status };
	}
	return {
		ok: true,
		panoId: meta.pano_id,
		lat: meta.location?.lat,
		lng: meta.location?.lng,
		ym: (meta.date ?? '').slice(0, 7) || '1970-01'
	};
}

async function request(url: string, attempt = 0): Promise<SvMetadata> {
	try {
		const res = await fetch(url);
		const json = (await res.json()) as SvMetadata;
		if (json.status === 'OVER_QUERY_LIMIT' && attempt < 5) {
			await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
			return request(url, attempt + 1);
		}
		return json;
	} catch {
		if (attempt < 5) {
			await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
			return request(url, attempt + 1);
		}
		return { status: 'UNKNOWN_ERROR' as SvMetadata['status'] };
	}
}

/** Tanda con concurrencia acotada: educados con el endpoint. */
export async function lookupAll<T>(
	items: T[],
	concurrency: number,
	worker: (item: T, index: number) => Promise<void>
): Promise<void> {
	let cursor = 0;
	const runners = Array.from({ length: concurrency }, async () => {
		while (cursor < items.length) {
			const index = cursor++;
			await worker(items[index], index);
		}
	});
	await Promise.all(runners);
}
