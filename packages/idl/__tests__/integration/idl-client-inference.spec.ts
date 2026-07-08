// General client-usage inference over the BUILT package — the explicit-provider path
// (`createIdlClient` + `codamaProvider`) with a per-call payload shape. Standard-specific inference
// routes live in functional/codama-inference.spec.ts and functional/anchor-inference.spec.ts.
import { createIdlClient } from '@explorer/idl';
import { codamaProvider } from '@explorer/idl/codama';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { loadTokenkegIdl, transferIx } from '../../src/__tests__/fixtures';

describe('integration: client inference (explicit provider)', () => {
    /** Case: the per-call shape is the SUPPORTED form for codama documents — codama's own parsers type decoded data as `unknown` (ParsedData), and runtime-fetched roots carry no literal type to infer from. */
    it('should hand back the transfer args with a per-call shape', () => {
        const tokenkeg = loadTokenkegIdl();
        // picking the default engine explicitly — heavier engines (anchor) plug in the same way
        const client = createIdlClient(tokenkeg, { provider: codamaProvider() });

        const decode = client.decodeInstruction(transferIx(tokenkeg));
        const result = client.getDecodedData<{ amount: bigint }>(decode);

        expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | undefined>();
        expect(result).toMatchObject({ amount: 42n });
    });
});
