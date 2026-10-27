import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

/** Todo lo que sale a la red se guarda: rehornear no vuelve a pedir nada. */
export function cacheKey(input: string): string {
	return createHash('sha1').update(input).digest('hex').slice(0, 16);
}

export function ensureDir(path: string): void {
	mkdirSync(dirname(path), { recursive: true });
}

export function readCache<T>(path: string): T | null {
	if (!existsSync(path)) return null;
	try {
		return JSON.parse(readFileSync(path, 'utf8')) as T;
	} catch {
		return null;
	}
}

export function writeCache(path: string, value: unknown): void {
	ensureDir(path);
	writeFileSync(path, JSON.stringify(value));
}

export function appendLine(path: string, value: unknown): void {
	ensureDir(path);
	writeFileSync(path, JSON.stringify(value) + '\n', { flag: 'a' });
}

export function readLines<T>(path: string): T[] {
	if (!existsSync(path)) return [];
	return readFileSync(path, 'utf8')
		.split('\n')
		.filter(Boolean)
		.map((line) => JSON.parse(line) as T);
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
