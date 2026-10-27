import { bboxDiagonalKm, clamp, formatKm, haversineKm, localDateString } from '../src/lib/utils';

describe('haversineKm', () => {
	it('da cero en el mismo punto', () => {
		expect(haversineKm(-34.6, -58.38, -34.6, -58.38)).toBe(0);
	});

	it('mide CABA a Rosario en ~278 km', () => {
		const d = haversineKm(-34.6037, -58.3816, -32.9477, -60.6304);
		expect(d).toBeGreaterThan(273);
		expect(d).toBeLessThan(283);
	});

	it('mide CABA a Madrid en ~10.050 km', () => {
		const d = haversineKm(-34.6037, -58.3816, 40.4168, -3.7038);
		expect(d).toBeGreaterThan(9900);
		expect(d).toBeLessThan(10200);
	});

	it('es simetrica', () => {
		const a = haversineKm(-34.6, -58.38, -24.78, -65.41);
		const b = haversineKm(-24.78, -65.41, -34.6, -58.38);
		expect(a).toBeCloseTo(b, 9);
	});
});

describe('bboxDiagonalKm', () => {
	it('da ~15.000 km para el mundo, igual que la convencion de GeoGuessr', () => {
		const d = bboxDiagonalKm([-180, -60, 180, 75]);
		expect(d).toBeGreaterThan(14500);
		expect(d).toBeLessThan(15500);
	});

	it('da decenas de km para una ciudad', () => {
		const d = bboxDiagonalKm([-58.8, -34.85, -58.15, -34.4]);
		expect(d).toBeGreaterThan(50);
		expect(d).toBeLessThan(120);
	});
});

describe('utils varios', () => {
	it('clamp respeta los bordes', () => {
		expect(clamp(5, 0, 3)).toBe(3);
		expect(clamp(-5, 0, 3)).toBe(0);
		expect(clamp(2, 0, 3)).toBe(2);
	});

	it('formatKm cambia de unidad por debajo del kilometro', () => {
		expect(formatKm(0.4)).toBe('400 m');
		expect(formatKm(12.6)).toContain('13');
	});

	it('localDateString no se corre por zona horaria', () => {
		expect(localDateString(new Date(2026, 0, 1, 2, 0, 0))).toBe('2026-01-01');
		expect(localDateString(new Date(2026, 11, 31, 23, 59, 0))).toBe('2026-12-31');
	});
});
