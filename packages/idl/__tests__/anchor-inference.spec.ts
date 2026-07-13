// Typed getDecodedData routes for ANCHOR IDLs over the BUILT package — one case per way a consumer
// can source the payload type: the generated companion type flowing through anchor's own
// Program.fetchIdl<T> generic (anchor-lang 1.1.2 and 0.31), and the per-call shape when only the
// wide runtime IDL exists. Codama IDLs live in codama-inference.spec.ts.
import {
    type AccountDecode,
    type AnchorIdl,
    createIdlClient,
    IdlStandard,
    type InstructionDecode,
} from '@explorer/idl';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { incrementIx, loadSimpleIdl, type Simple, type Simple031 } from '../src/__tests__/fixtures';
import { counterAccountData, fetchAnchorIdl } from './anchor-helpers';

const DEFAULT_ADDRESS = '11111111111111111111111111111111';

describe('functional: typed getDecodedData routes (anchor IDLs)', () => {
    describe('generated companion type — Program.fetchIdl<Simple> flows inference with no generics', () => {
        /** Case: the anchor-lang 1.1.2 document fetched with its companion type — args infer, no generics at the decode calls. */
        it('should decode the increment instruction with args inferred from the generated type', async () => {
            const simple = await fetchAnchorIdl<Simple>(loadSimpleIdl);
            const client = createIdlClient(simple);

            const decode = client.decodeInstruction(incrementIx(simple));
            const result = client.getDecodedData(decode);

            expectTypeOf(simple).toEqualTypeOf<Simple>();
            // the anchor client keeps every arm (codama engine + injected-decoder anchor arm)
            expectTypeOf(decode).toEqualTypeOf<InstructionDecode>();
            // the union covers every declared instruction: increment({amount}) | initialize (no args → empty struct)
            expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | Record<string, never> | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ amount: 42n });
        });

        /** Case: the same generated type infers account struct fields (its camelCase view matches codama-decoded keys). */
        it('should decode counter account bytes with fields inferred from the generated type', async () => {
            const simple = await fetchAnchorIdl<Simple>(loadSimpleIdl);
            const client = createIdlClient(simple);

            const decode = client.decodeAccount(counterAccountData(simple));
            const result = client.getDecodedData(decode);

            expectTypeOf(decode).toEqualTypeOf<AccountDecode>();
            expectTypeOf(result).toEqualTypeOf<{ authority: string; count: bigint } | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ authority: DEFAULT_ADDRESS, count: 7n });
        });
    });

    describe('anchor fetch generic — Program.fetchIdl<Simple031> keeps the literal type', () => {
        /** Case: the 0.31 document arrives through anchor's client (Program.fetchIdl<Simple031>) — inference flows the same. */
        it("should decode the 0.31 increment instruction for an IDL fetched with anchor's client", async () => {
            const simple031 = await fetchAnchorIdl<Simple031>();
            const client = createIdlClient(simple031);

            const decode = client.decodeInstruction(incrementIx(simple031));
            const result = client.getDecodedData(decode);

            expectTypeOf(simple031).toEqualTypeOf<Simple031>();
            expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | Record<string, never> | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ amount: 42n });
        });

        /** Case: the typed fetch also infers account fields — no generic at the call. */
        it("should decode 0.31 counter account fields for an IDL fetched with anchor's client", async () => {
            const simple031 = await fetchAnchorIdl<Simple031>();
            const client = createIdlClient(simple031);

            const decode = client.decodeAccount(counterAccountData(simple031));
            const result = client.getDecodedData(decode);

            expectTypeOf(result).toEqualTypeOf<{ authority: string; count: bigint } | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ authority: DEFAULT_ADDRESS, count: 7n });
        });
    });

    describe('per-call shape — the route when only the wide runtime IDL exists', () => {
        /** Case: the same document fetched WITHOUT a generic — wide `AnchorIdl`, so the field shape is passed per call. */
        it('should decode 0.31 counter account bytes with a per-call shape', async () => {
            const simple031 = await fetchAnchorIdl(); // no generic → wide AnchorIdl
            const client = createIdlClient(simple031);

            const decode = client.decodeAccount(counterAccountData(simple031));
            // the deliberate per-call variant: the declared shape types the result exactly
            const result = client.getDecodedData<{ authority: string; count: bigint }>(decode);

            expectTypeOf(simple031).toEqualTypeOf<AnchorIdl>();
            expectTypeOf(decode).toEqualTypeOf<AccountDecode>();
            expectTypeOf(result).toEqualTypeOf<{ authority: string; count: bigint } | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ authority: DEFAULT_ADDRESS, count: 7n });
        });

        /** Case: the wide document's instruction args also take a per-call shape. */
        it('should decode the 0.31 increment instruction with a per-call shape', async () => {
            const simple031 = await fetchAnchorIdl(); // no generic → wide AnchorIdl
            const client = createIdlClient(simple031);

            const decode = client.decodeInstruction(incrementIx(simple031));
            const result = client.getDecodedData<{ amount: bigint }>(decode);

            expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ amount: 42n });
        });
    });
});
