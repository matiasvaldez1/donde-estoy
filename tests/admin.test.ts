import {
	bboxContains,
	featureAt,
	pointInMultiPolygon,
	pointInPolygon,
	pointInRing,
	ringsBBox
} from '../src/lib/data/admin';
import type { AdminFeature, Ring } from '../src/lib/data/admin';

const cuadrado: Ring = [
	[-10, -10],
	[10, -10],
	[10, 10],
	[-10, 10],
	[-10, -10]
];

const hueco: Ring = [
	[-2, -2],
	[2, -2],
	[2, 2],
	[-2, 2],
	[-2, -2]
];

describe('pointInRing', () => {
	it('ve el centro adentro y el exterior afuera', () => {
		expect(pointInRing(0, 0, cuadrado)).toBe(true);
		expect(pointInRing(20, 0, cuadrado)).toBe(false);
		expect(pointInRing(0, 50, cuadrado)).toBe(false);
	});
});

describe('pointInPolygon', () => {
	it('el hueco no cuenta como adentro', () => {
		expect(pointInPolygon(5, 5, [cuadrado, hueco])).toBe(true);
		expect(pointInPolygon(0, 0, [cuadrado, hueco])).toBe(false);
	});

	it('poligono vacio es siempre afuera', () => {
		expect(pointInPolygon(0, 0, [])).toBe(false);
	});
});

describe('pointInMultiPolygon', () => {
	const lejano: Ring = [
		[100, 40],
		[110, 40],
		[110, 50],
		[100, 50],
		[100, 40]
	];

	it('alcanza con estar en una de las partes', () => {
		expect(pointInMultiPolygon(105, 45, [[cuadrado], [lejano]])).toBe(true);
		expect(pointInMultiPolygon(0, 0, [[cuadrado], [lejano]])).toBe(true);
		expect(pointInMultiPolygon(60, 0, [[cuadrado], [lejano]])).toBe(false);
	});
});

describe('featureAt', () => {
	const features: AdminFeature[] = [
		{ id: 'a', name: 'A', bbox: ringsBBox([[cuadrado]]), polygons: [[cuadrado]] },
		{ id: 'b', name: 'B', bbox: [100, 40, 110, 50], polygons: [[[[100, 40], [110, 40], [110, 50], [100, 50], [100, 40]] as Ring]] }
	];

	it('resuelve a que jurisdiccion cae el punto', () => {
		expect(featureAt(features, 0, 0)?.id).toBe('a');
		expect(featureAt(features, 105, 45)?.id).toBe('b');
	});

	it('devuelve null fuera de todo', () => {
		expect(featureAt(features, -170, -80)).toBeNull();
	});
});

describe('ringsBBox y bboxContains', () => {
	it('calcula la envolvente', () => {
		expect(ringsBBox([[cuadrado]])).toEqual([-10, -10, 10, 10]);
	});

	it('bboxContains incluye los bordes', () => {
		expect(bboxContains([-10, -10, 10, 10], -10, 10)).toBe(true);
		expect(bboxContains([-10, -10, 10, 10], -11, 0)).toBe(false);
	});
});
