import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { Simple } from '@explorer/idl-program-simple/types';

import type { AnchorIdl } from '../../types';

const readSimpleJson = (): unknown => {
    try {
        return JSON.parse(
            readFileSync(createRequire(import.meta.url).resolve('@explorer/idl-program-simple'), 'utf8'),
        );
    } catch (cause) {
        // direct vitest runs skip the pretest hook that builds the programs
        throw new Error('simple program IDL missing — run `pnpm run build:programs` first', { cause });
    }
};

/** IDL emitted by `anchor build` (anchor-lang 1.1.2) for `test-anchor-programs/simple`; fresh via the pretest hook. */
export const loadSimpleIdl = (): AnchorIdl => readSimpleJson() as AnchorIdl;

/**
 * Same document typed with anchor's generated companion type (the `Program<Simple>` idiom). Its
 * camelCase view matches the codama-DECODED payload keys, so payload inference is exact; only
 * document name reads differ at runtime (the JSON keeps Rust casing, e.g. 'Counter').
 */
export const loadSimpleIdlTyped = (): Simple => readSimpleJson() as Simple;
