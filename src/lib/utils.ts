const EARTH_RADIUS_KM = 6371;

export function toRad(deg: number): number {
	return (deg * Math.PI) / 180;
}

/** Distancia de circulo maximo en km. */
export function haversineKm(
	aLat: number,
	aLng: number,
	bLat: number,
	bLng: number
): number {
	const dLat = toRad(bLat - aLat);
	const dLng = toRad(bLng - aLng);
	const h =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
	return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Diagonal de una bbox [oeste, sur, este, norte] en km. */
export function bboxDiagonalKm(bbox: [number, number, number, number]): number {
	const [w, s, e, n] = bbox;
	return haversineKm(s, w, n, e);
}

export function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/** Fecha local en es-AR como 'YYYY-MM-DD', sin saltos por zona horaria. */
export function localDateString(date = new Date()): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

export function formatDate(iso: string): string {
	const [y, m, d] = iso.split('-').map(Number);
	return new Date(y, m - 1, d).toLocaleDateString('es-AR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

export function formatScore(score: number): string {
	return score.toLocaleString('es-AR');
}

export function formatKm(km: number): string {
	if (km < 1) return `${Math.round(km * 1000)} m`;
	if (km < 10) return `${km.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
	return `${Math.round(km).toLocaleString('es-AR')} km`;
}

export function formatClock(seconds: number): string {
	const s = Math.max(0, Math.round(seconds));
	const m = Math.floor(s / 60);
	return `${m}:${String(s % 60).padStart(2, '0')}`;
}
