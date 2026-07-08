// Typed getDecodedData routes for ANCHOR IDLs over the BUILT package — one case per way a consumer
// can source the payload type: the repo-bundled generated companion type, anchor's Program.fetchIdl
// generic, and the per-call shape when only the wide runtime IDL exists. Codama IDLs live in
// codama-inference.spec.ts; general client usage in ../integration/idl-client-inference.spec.ts.
import { type AccountDecode, type AnchorIdl, IdlStandard, type InstructionDecode } from '@explorer/idl';
import { createCodamaIdlClient } from '@explorer/idl/codama';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { incrementIx, loadSimpleIdlTyped, type Simple } from '../../src/__tests__/fixtures';
import { counterAccountData, fetchSimple031Idl } from '../anchor-helpers';

const DEFAULT_ADDRESS = '11111111111111111111111111111111';

describe('functional: typed getDecodedData routes (anchor IDLs)', () => {
    describe('generated companion type — inference with no generics', () => {
        /** Case: repo-bundled document paired with the anchor-generated companion type — args infer, no generics. */
        it('should decode the increment instruction with args inferred from the generated type', () => {
            const simple = loadSimpleIdlTyped();
            const client = createCodamaIdlClient(simple);

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
            expect(result).toMatchObject({ authority: DEFAULT_ADDRESS, count: 7n });
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

        /** Case: the typed fetch also infers account fields — no generic at the call. */
        it("should decode 0.31 counter account fields for an IDL fetched with anchor's client", async () => {
            const simple031 = await fetchSimple031Idl();
            const client = createCodamaIdlClient(simple031);

            const decode = client.decodeAccount(counterAccountData(simple031));
            const result = client.getDecodedData(decode);

            expectTypeOf(result).toEqualTypeOf<{ authority: string; count: bigint } | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ authority: DEFAULT_ADDRESS, count: 7n });
        });
    });

    describe('per-call shape — the route when only the wide runtime IDL exists', () => {
        /** Case: the same fetched document held wide (fetchIdl without a generic) — the field shape is passed per call. */
        it('should decode 0.31 counter account bytes with a per-call shape', async () => {
            const simple031: AnchorIdl = await fetchSimple031Idl();
            const client = createCodamaIdlClient(simple031);

            const decode = client.decodeAccount(counterAccountData(simple031));
            // the deliberate per-call variant: the declared shape types the result exactly
            const result = client.getDecodedData<{ authority: string; count: bigint }>(decode);

            expectTypeOf(decode).toEqualTypeOf<AccountDecode>();
            expectTypeOf(result).toEqualTypeOf<{ authority: string; count: bigint } | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ authority: DEFAULT_ADDRESS, count: 7n });
        });

        /** Case: the wide document's instruction args also take a per-call shape. */
        it('should decode the 0.31 increment instruction with a per-call shape', async () => {
            const simple031: AnchorIdl = await fetchSimple031Idl();
            const client = createCodamaIdlClient(simple031);

            const decode = client.decodeInstruction(incrementIx(simple031));
            const result = client.getDecodedData<{ amount: bigint }>(decode);

            expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | undefined>();
            expect(decode.kind).toBe(IdlStandard.Codama);
            expect(result).toMatchObject({ amount: 42n });
        });
    });
});
