/**
 * Genera el favicon a partir de la misma grilla 8x8 que usan los iconos de la
 * interfaz, así no hay dos fuentes de verdad para el mismo dibujo.
 *
 * El PNG se escribe a mano (zlib + CRC32, ambos de la librería estándar): meter
 * una dependencia de imágenes para dibujar 64 píxeles sería desproporcionado.
 *
 *   pnpm tsx scripts/make-favicon.ts
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ICONS } from '../src/lib/ui/icons.ts';

const GLYPH = ICONS.pin;
const FG: [number, number, number] = [0x4a, 0xde, 0x80]; // --color-accent
const BG: [number, number, number] = [0x0f, 0x0f, 0x0f]; // --color-bg-primary

const CRC_TABLE = (() => {
	const table = new Int32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		table[n] = c;
	}
	return table;
})();

function crc32(buf: Buffer): number {
	let c = 0xffffffff;
	for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(body));
	return Buffer.concat([len, body, crc]);
}

/** PNG RGBA sin filtros: la imagen es minúscula, no hace falta optimizar. */
function png(size: number): Buffer {
	const cell = size / GLYPH.length;
	const raw = Buffer.alloc(size * (size * 4 + 1));
	let offset = 0;
	for (let y = 0; y < size; y++) {
		raw[offset++] = 0; // filtro "none"
		const row = GLYPH[Math.floor(y / cell)];
		for (let x = 0; x < size; x++) {
			const on = row[Math.floor(x / cell)] === '#';
			const [r, g, b] = on ? FG : BG;
			raw[offset++] = r;
			raw[offset++] = g;
			raw[offset++] = b;
			raw[offset++] = 255;
		}
	}

	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(size, 0);
	ihdr.writeUInt32BE(size, 4);
	ihdr[8] = 8; // bits por canal
	ihdr[9] = 6; // RGBA
	return Buffer.concat([
		Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
		chunk('IHDR', ihdr),
		chunk('IDAT', deflateSync(raw, { level: 9 })),
		chunk('IEND', Buffer.alloc(0))
	]);
}

function svg(): string {
	const rects: string[] = [];
	GLYPH.forEach((row, y) => {
		[...row].forEach((cell, x) => {
			if (cell === '#') rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
		});
	});
	return [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges">`,
		`<rect width="8" height="8" fill="#0f0f0f"/>`,
		`<g fill="#4ade80">${rects.join('')}</g>`,
		`</svg>`
	].join('');
}

mkdirSync('static', { recursive: true });
writeFileSync('static/favicon.png', png(32));
writeFileSync('static/apple-touch-icon.png', png(180));
writeFileSync('static/favicon.svg', svg() + '\n');
console.log('favicon.png (32) · apple-touch-icon.png (180) · favicon.svg');
