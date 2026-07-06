import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { AnchorIdl } from '../../types';

/** IDL emitted by `anchor build` (anchor-lang 0.31.1) for `programs/simple-031`; fresh via the pretest hook. */
export const loadSimple031Idl = (): AnchorIdl =>
    JSON.parse(
        readFileSync(createRequire(import.meta.url).resolve('@explorer/idl-program-simple-031'), 'utf8'),
    ) as AnchorIdl;
