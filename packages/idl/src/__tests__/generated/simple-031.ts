import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { AnchorIdl } from '../../types';

/** IDL emitted by `anchor build` (anchor-lang 0.31.1) for `test-anchor-programs/simple-031`; fresh via the pretest hook. */
export const loadSimple031Idl = (): AnchorIdl => {
    try {
        return JSON.parse(
            readFileSync(createRequire(import.meta.url).resolve('@explorer/idl-program-simple-031'), 'utf8'),
        ) as AnchorIdl;
    } catch (cause) {
        // direct vitest runs skip the pretest hook that builds the programs
        throw new Error('simple-031 program IDL missing — run `pnpm run build:programs` first', { cause });
    }
};
