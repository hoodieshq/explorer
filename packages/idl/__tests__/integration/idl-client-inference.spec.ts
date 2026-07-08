// Typed getDecodedData routes over the BUILT package — one case per way a consumer can source the
// payload type: the repo-bundled generated companion type, anchor's fetch generic, and the per-call
// shape when only the runtime IDL exists. The runtime capability flows live in idl-client.spec.ts.
import {
    type AccountDecode,
    type AnchorIdl,
    createIdlClient,
    IdlStandard,
    type InstructionDecode,
} from '@explorer/idl';
import { codamaProvider, createCodamaIdlClient } from '@explorer/idl/codama';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    incrementIx,
    loadSimpleIdlTyped,
    loadTokenkegIdl,
    type Simple,
    transferIx,
} from '../../src/__tests__/fixtures';
import { counterAccountData, fetchSimple031Idl } from './helpers';

describe('integration: typed getDecodedData routes (built package)', () => {
    describe('generated companion type — inference with no generics', () => {
        /** Case: repo-bundled document paired with the anchor-generated companion type — args infer, no generics. */
        it('should decode the increment instruction with args inferred from the generated type', () => {
            const simple = loadSimpleIdlTyped();
            const client = createCodamaIdlClient(simple);

            // TODO: combine these two helpers into one
            const decode = client.decodeInstruction(incrementIx(simple));
            const result = client.getDecodedData(decode);

            expectTypeOf(simple).toEqualTypeOf<Simple>();
            // the anchor client keeps every arm (codama engine + injected-decoder anchor arm)
            expectTypeOf(decode).toEqualTypeOf<InstructionDecode>();
            // the union covers every declared instruction: increment({amount}) | initialize (no args → {})
            // TODO: check how to remove {} from the inferred type
            expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | NonNullable<unknown> | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ amount: 42n });
        });

        /** Case: the same generated type infers account struct fields (its camelCase view matches codama-decoded keys). */
        it('should decode counter account bytes with fields inferred from the generated type', () => {
            const simple = loadSimpleIdlTyped();
            const client = createCodamaIdlClient(simple);

            const decode = client.decodeAccount(counterAccountData(simple));
            const result = client.getDecodedData(decode);

            expectTypeOf(decode).toEqualTypeOf<AccountDecode>();
            expectTypeOf(result).toEqualTypeOf<{ authority: string; count: bigint } | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({
                authority: '11111111111111111111111111111111',
                count: 7n,
            });
        });
    });

    describe('anchor fetch generic — Program.fetchIdl<Simple031> keeps the literal type', () => {
        /** Case: the 0.31 document arrives through anchor's client (Program.fetchIdl<Simple031>) — inference flows the same. */
        it("should decode the 0.31 increment instruction for an IDL fetched with anchor's client", async () => {
            const simple031 = await fetchSimple031Idl();
            const client = createCodamaIdlClient(simple031);

            const decode = client.decodeInstruction(incrementIx(simple031));
            const result = client.getDecodedData(decode);

            expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | NonNullable<unknown> | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ amount: 42n });
        });
    });

    describe('per-call shape — the route when only the runtime IDL exists', () => {
        /** Case: the same fetched document held wide (fetchIdl without a generic) — the field shape is passed per call. */
        it('should decode 0.31 counter account bytes with a per-call shape', async () => {
            const simple031: AnchorIdl = await fetchSimple031Idl();
            const client = createCodamaIdlClient(simple031);

            // TODO: check why we can not infer this type here
            const decode = client.decodeAccount(counterAccountData(simple031));
            // the deliberate per-call variant: the declared shape types the result exactly
            const result = client.getDecodedData<{ authority: string; count: bigint }>(decode);

            expectTypeOf(decode).toEqualTypeOf<AccountDecode>();
            expectTypeOf(result).toEqualTypeOf<{ authority: string; count: bigint } | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({
                authority: '11111111111111111111111111111111',
                count: 7n,
            });
        });

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
});
