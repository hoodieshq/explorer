// Compile-time guidance for the legacy Anchor (< 0.30) route — vitest typecheck only, nothing executes.
import type { Instruction } from '@solana/kit';
import { describe, expectTypeOf, it } from 'vitest';

import { createIdlClient, type IdlClient, tryCreateIdlClient } from '../../client';
import { isLegacyAnchorIdl } from '../../detect';
import { IDL_ERROR__UNSUPPORTED_IDL_FORMAT, type IdlError } from '../../errors';
import type { LegacyAnchorIdl } from '../../types';
import { legacyAnchorIdl, legacyGeneratedIdl, legacyWithdrawIx } from '../fixtures';

describe('sample: legacy Anchor (< 0.30) IDL — custom decoder outside the client', () => {
    it('should reject a legacy IDL at compile time in the typed constructor', () => {
        // @ts-expect-error legacy Anchor IDLs are not SupportedIdl — the compiler blocks the client route
        createIdlClient(legacyAnchorIdl);
    });

    it('should force the developer through error handling for untrusted input', () => {
        const [error, client] = tryCreateIdlClient(legacyAnchorIdl);

        expectTypeOf(error).toEqualTypeOf<IdlError<typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT> | undefined>();
        expectTypeOf(client).toEqualTypeOf<IdlClient | undefined>();
    });

    it('should narrow the legacy document with the guard so a custom decoder receives a typed IDL', () => {
        const value: unknown = legacyAnchorIdl;
        if (isLegacyAnchorIdl(value)) {
            expectTypeOf(value).toEqualTypeOf<LegacyAnchorIdl>();
            expectTypeOf(value.instructions[0].name).toEqualTypeOf<string>();
        }
    });
});

// A custom decoder generic over the literal legacy IDL — instruction names stay a literal union.
type LegacyName<T extends LegacyAnchorIdl> = T['instructions'][number]['name'];
declare function decodeLegacy<T extends LegacyAnchorIdl>(
    idl: T,
    ix: Instruction,
): { args: unknown; name: LegacyName<T> } | undefined;

describe('sample: legacy Anchor with generated types', () => {
    it('should satisfy the LegacyAnchorIdl contract with a const-asserted generated document', () => {
        expectTypeOf(legacyGeneratedIdl).toExtend<LegacyAnchorIdl>();
    });

    it('should give the custom decoder literal instruction-name guidance from the generated type', () => {
        const decoded = decodeLegacy(legacyGeneratedIdl, legacyWithdrawIx);
        expectTypeOf(decoded).toEqualTypeOf<{ args: unknown; name: 'close' | 'withdraw' } | undefined>();
    });

    it('should still reject the generated legacy document in the client at compile time', () => {
        // @ts-expect-error generated or not, a legacy IDL is not SupportedIdl
        createIdlClient(legacyGeneratedIdl);
    });
});
