import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { Simple031 } from '@explorer/test-idl-program-simple-031/types';

import type { AnchorIdl } from '../../types';

const readSimple031Json = (): unknown => {
    try {
        return JSON.parse(
            readFileSync(createRequire(import.meta.url).resolve('@explorer/test-idl-program-simple-031'), 'utf8'),
        );
    } catch (cause) {
        // direct vitest runs skip the pretest hook that builds the programs
        throw new Error('simple-031 program IDL missing — run `pnpm run build:programs` first', { cause });
    }
};

/** IDL emitted by `anchor build` (anchor-lang 0.31.1) for `test-anchor-programs/simple-031`; fresh via the pretest hook. */
export const loadSimple031Idl = (): AnchorIdl => readSimple031Json() as AnchorIdl;

/**
 * Same document typed with anchor's generated companion type (the `Program<Simple031>` idiom). Its
 * camelCase view matches the codama-DECODED payload keys, so payload inference is exact; only
 * document name reads differ at runtime (the JSON keeps Rust casing, e.g. 'Counter').
 */
export const loadSimple031IdlTyped = (): Simple031 => readSimple031Json() as Simple031;
