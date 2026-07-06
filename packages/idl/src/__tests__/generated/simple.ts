import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { AnchorIdl } from '../../types';

/** IDL emitted by `anchor build` (anchor-lang 1.1.2) for `programs/simple`; fresh via the pretest hook. */
export const loadSimpleIdl = (): AnchorIdl =>
    JSON.parse(
        readFileSync(createRequire(import.meta.url).resolve('@explorer/idl-program-simple'), 'utf8'),
    ) as AnchorIdl;
