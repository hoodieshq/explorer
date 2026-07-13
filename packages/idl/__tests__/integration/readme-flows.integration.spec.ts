// README-level consumer flows — one case per way a user meets the library, written to be lifted
// into the README verbatim. Same engine everywhere (codamaProvider); only the TYPE source differs.
// Grouped by input standard, default inference first within each group:
//   codama documents
//     1. the schema as the type source               → default inference, zero generics
//     2. field-shape cheat sheet                     → where inferred shapes differ from expectations
//     3. + a renderers-js-generated type             → AsDecoded bridges the codec view to parser output
//   anchor documents (decoded through the same codama engine)
//     4. bare document (runtime acquisition)         → decode stays exact, payload types are unknown
//     5. + the satellite type anchor emits           → zero generics again (the pairing keeps the literals)
//     6. + the satellite type passed EXPLICITLY      → anchor's own fetch generic carries the pairing
// `decodeInstructionData`/`decodeAccountData` are the one-step routes: decode + typed payload as an
// error-first Result — no decode-arm branching; failures carry the pipeline's own error.
import { type AsDecoded, createIdlClient } from '@explorer/idl';
import { codamaProvider } from '@explorer/idl/codama';
import { vaultIdl } from '@explorer/test-idl-program-vault';
// the wide anchor document type is anchor's own — the library's AnchorIdl is a direct alias of it
import type { Idl } from '@coral-xyz/anchor';
import type { Instruction } from '@solana/kit';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { exampleNativeTokenTransfersIdl } from '../../__fixtures__/example_native_token_transfers.codama';
import {
    incrementIx,
    loadSimpleIdl,
    loadSimpleIdlTyped,
    loadTokenkegIdl,
    type Simple031,
    u64le,
} from '../../src/__tests__/fixtures';
import { fetchAnchorIdl } from '../anchor-helpers';
import { base16, base64, DEFAULT_ADDRESS, encodeAccount } from '../codama-helpers';
// renderers-js output for SPL Token — type-only import, erased at runtime
import type { Multisig } from '../functional/generated/token-client/accounts/multisig';

/* eslint-disable @typescript-eslint/consistent-type-assertions -- the vault publicKey cast bridges the literal document with the kit Instruction shape */

describe('README flows: how payload types reach the consumer', () => {
    describe('codama documents', () => {
        it('should infer payloads from the IDL schema itself with zero generics', () => {
            // the schema is the type source — no generics, no companion types; the only requirement is
            // that the document is bundled as TS source (`as const`) so the compiler can read it
            const client = createIdlClient(vaultIdl, { provider: codamaProvider() });

            const [, data] = client.decodeInstructionData({
                accounts: [],
                data: Uint8Array.from([1, ...u64le(42n)]), // deposit: u8 discriminator + u64 amount
                programAddress: vaultIdl.program.publicKey as Instruction['programAddress'],
            });
            //        ^? data: { amount: bigint; discriminator: number } | undefined — read off the schema's `deposit` instruction

            expectTypeOf(data).toEqualTypeOf<{ amount: bigint; discriminator: number } | undefined>();
            expect(data).toEqual({ amount: 42n, discriminator: 1 });
        });

        it('should infer parser-shaped field types where they differ from codec-level expectations', () => {
            // a generated codama document (converted wormhole NTT) — its config account collects every
            // field shape that surprises people coming from generated clients or anchor coders
            const client = createIdlClient(exampleNativeTokenTransfersIdl, { provider: codamaProvider() });
            const bytes = encodeAccount(exampleNativeTokenTransfersIdl, 'config', {
                bump: 254,
                chainId: { id: 1 },
                custody: DEFAULT_ADDRESS,
                discriminator: base16('9b0caae01efacc82'),
                enabledTransceivers: { map: 1n },
                mint: DEFAULT_ADDRESS,
                mode: 'burning',
                nextTransceiverId: 1,
                owner: DEFAULT_ADDRESS,
                paused: false,
                pendingOwner: null,
                threshold: 1,
                tokenProgram: DEFAULT_ADDRESS,
            });

            const [, data] = client.decodeAccountData(bytes);
            //        ^? union over every account the schema declares — pick the config member by shape
            type ConfigAccount = Extract<NonNullable<typeof data>, { enabledTransceivers: unknown }>;

            expectTypeOf<ConfigAccount['owner']>().toEqualTypeOf<string>();
            //           ^? string — pubkeys decode to plain base58 strings, NOT branded Address values
            expectTypeOf<ConfigAccount['pendingOwner']>().toEqualTypeOf<
                { __option: 'None' } | { __option: 'Some'; value: string }
            >();
            //           ^? the kit Option object, NOT `string | null`
            expectTypeOf<ConfigAccount['mode']>().toEqualTypeOf<number>();
            //           ^? number — scalar enums decode to the VARIANT INDEX, not the variant name
            expectTypeOf<ConfigAccount['discriminator']>().toEqualTypeOf<[string, string]>();
            //           ^? [encoding, data] — byte fields decode to tuples, NOT Uint8Array
            expectTypeOf<ConfigAccount['enabledTransceivers']>().toEqualTypeOf<{ map: bigint }>();
            //           ^? u128 (and u64/i64/i128) decode to bigint, NOT number

            expect(data).toMatchObject({
                discriminator: base64('mwyq4B76zII='), // the same bytes, re-encoded as base64 by the parser
                mode: 1, // 'burning' went in by name, its index came back out
                owner: DEFAULT_ADDRESS,
                pendingOwner: { __option: 'None' },
            });
        });

        it('should refine a fetched codama document with a generated client type via AsDecoded', () => {
            // the document arrives at runtime (PMP fetch) — wide, no static guidance of its own
            const tokenkeg = loadTokenkegIdl();
            const client = createIdlClient(tokenkeg, { provider: codamaProvider() });
            // multisig carries no discriminator field — it is identified by its exact size
            const bytes = encodeAccount(tokenkeg, 'multisig', {
                isInitialized: true,
                m: 1,
                n: 1,
                signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
            });

            // WITHOUT the bridge: the rendered client's type describes the CODEC view…
            const [, codecView] = client.decodeAccountData<Multisig>(bytes);
            //        ^? codecView: Multisig | undefined — signers: Address[], a branded claim the parser does NOT uphold
            expectTypeOf(codecView).toEqualTypeOf<Multisig | undefined>();

            // …WITH AsDecoded (a library export) the same type is remapped to what the parser returns:
            // branded Address → plain base58 string, byte fields → [encoding, data] tuples
            const [, data] = client.decodeAccountData<AsDecoded<Multisig>>(bytes);
            //        ^? data: { isInitialized: boolean; m: number; n: number; signers: string[] } | undefined

            expectTypeOf(data).toEqualTypeOf<
                { isInitialized: boolean; m: number; n: number; signers: string[] } | undefined
            >();
            expect(data).toEqual({
                isInitialized: true,
                m: 1,
                n: 1,
                signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
            });
        });
    });

    describe('anchor documents (decoded through the same codama engine)', () => {
        it('should keep decoding exact while typing payloads unknown for a bare anchor document', () => {
            // runtime acquisition with no satellite type — the wide AnchorIdl carries no literals
            const wide: Idl = loadSimpleIdl();
            const client = createIdlClient(wide, { provider: codamaProvider() });

            // default inference degrades honestly: the value is exact at runtime, unknown statically
            const [, data] = client.decodeInstructionData(incrementIx(wide));
            //        ^? data: unknown — a wide document carries no literals to read
            expectTypeOf(data).toBeUnknown();
            expect(data).toMatchObject({ amount: 42n });

            // the per-call escape hatch: the consumer claims the shape where they know it —
            // the claim is compile-time only, the runtime value may carry more fields than claimed
            const [, claimed] = client.decodeInstructionData<{ amount: bigint }>(incrementIx(wide));
            //        ^? claimed: { amount: bigint } | undefined — exactly what was claimed, trusted not verified
            expectTypeOf(claimed).toEqualTypeOf<{ amount: bigint } | undefined>();
            expect(claimed).toMatchObject({ amount: 42n });
        });

        it('should infer payloads from an anchor document paired with its satellite type', () => {
            // `anchor build` emits a TS satellite type next to the JSON — pairing them keeps the literals
            const simple = loadSimpleIdlTyped();
            const client = createIdlClient(simple, { provider: codamaProvider() });

            const [, data] = client.decodeInstructionData(incrementIx(simple));
            //        ^? data: { amount: bigint } | Record<string, never> | undefined — one member per declared instruction

            expectTypeOf(data).toEqualTypeOf<{ amount: bigint } | Record<string, never> | undefined>();
            expect(data).toMatchObject({ amount: 42n });
        });

        it('should infer payloads for an anchor document fetched with an explicit satellite generic', async () => {
            // the same pairing made explicit at the acquisition point: anchor's own
            // Program.fetchIdl<T> generic stamps the satellite type onto the fetched document
            const simple031 = await fetchAnchorIdl<Simple031>();
            const client = createIdlClient(simple031, { provider: codamaProvider() });

            const [, data] = client.decodeInstructionData(incrementIx(simple031));
            //        ^? data: { amount: bigint } | Record<string, never> | undefined — same guidance, explicit source

            expectTypeOf(data).toEqualTypeOf<{ amount: bigint } | Record<string, never> | undefined>();
            expect(data).toMatchObject({ amount: 42n });
        });
    });
});
