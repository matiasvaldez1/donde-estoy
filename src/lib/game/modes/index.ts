import type { ModeDef, ModeId } from '../../types';
import { clasica } from './clasica';
import { escalera } from './escalera';
import { racha } from './racha';
import { contrarreloj } from './contrarreloj';
import { muerteSubita } from './muerte-subita';
import { diario } from './diario';

export const MODES: Record<ModeId, ModeDef> = {
	clasica,
	escalera,
	racha,
	contrarreloj,
	'muerte-subita': muerteSubita,
	diario
};

/** Orden en que se muestran en el menu. */
export const MODE_LIST: ModeDef[] = [
	clasica,
	escalera,
	racha,
	contrarreloj,
	muerteSubita,
	diario
];

export function getMode(id: string): ModeDef | null {
	return MODES[id as ModeId] ?? null;
}

export { clasica, escalera, racha, contrarreloj, muerteSubita, diario };
