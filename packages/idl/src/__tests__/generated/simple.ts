import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import type { AnchorIdl } from '../../types';
import type { SimpleIdl } from './simple.literal';

const readSimpleJson = (): unknown =>
    JSON.parse(
        readFileSync(createRequire(import.meta.url).resolve('@explorer/idl-program-simple'), 'utf8'),
    );

/** IDL emitted by `anchor build` (anchor-lang 1.1.2) for `programs/simple`; fresh via the pretest hook. */
export const loadSimpleIdl = (): AnchorIdl => readSimpleJson() as AnchorIdl;

/** Same document, loader-declared literal type — payload inference works without per-call shapes. */
export const loadSimpleIdlTyped = (): SimpleIdl => readSimpleJson() as SimpleIdl;
