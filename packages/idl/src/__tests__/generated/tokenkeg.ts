import { readFileSync } from 'node:fs';

import type { CodamaIdl } from '../../types';

/** SPL Token's PMP-stored Codama root node (mainnet snapshot). */
export const loadTokenkegIdl = (): CodamaIdl =>
    JSON.parse(readFileSync(new URL('./tokenkeg.pmp.idl.json', import.meta.url), 'utf8')) as CodamaIdl;
