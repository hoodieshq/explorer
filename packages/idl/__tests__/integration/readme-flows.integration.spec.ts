// README-level consumer flows — one case per way a user meets the library, written to be lifted
// into the README verbatim. Same engine everywhere (codamaProvider); the axes are the input standard
// and WHEN knowledge exists: build time (a type is present → static typings) vs runtime (only the
// fetched JSON exists → exact schema in the decode, payloads statically unknown).
//   codama IDLs
//     build time — 1. the schema as the type source; 2. field-shape cheat sheet; 3. a generated
//                  client type refines a fetched IDL (AsDecoded bridges the codec view)
//     runtime    — 4. payloads unknown, values exact; 5. the decode carries the exact schema
//   anchor IDLs (decoded through the same codama engine)
//     build time — 6. the satellite type anchor emits; 7. the satellite type passed explicitly
//     runtime    — 8. payloads unknown + the per-call claim; 9. the schema is CREATED from the
//                  anchor JSON by the internal conversion
// `decodeInstructionData`/`decodeAccountData` are the one-step routes (typed payload as an
// error-first Result); `unwrap` narrows the two-step route to the default (codama) arm (payload + schema node).
import { type AccountsDataOf, type AsDecoded, createIdlClient, unwrap } from '@explorer/idl';
import { codamaProvider } from '@explorer/idl/codama';
import { vaultIdl } from '@explorer/test-idl-program-vault';
// the wide anchor IDL type is anchor's own — the library's AnchorIdl is a direct alias of it
import type { Idl } from '@coral-xyz/anchor';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { exampleNativeTokenTransfersIdl } from '../../__fixtures__/example_native_token_transfers.codama';
import {
    depositIx,
    incrementIx,
    loadSimpleIdl,
    loadSimpleIdlTyped,
    loadTokenkegIdl,
    type Simple031,
} from '../../src/__tests__/fixtures';
import { fetchAnchorIdl } from '../anchor-helpers';
import { base16, base64, DEFAULT_ADDRESS, encodeAccount } from '../codama-helpers';
// renderers-js output for SPL Token — type-only import, erased at runtime
import type { Multisig } from '../functional/generated/token-client/accounts/multisig';

// a token multisig account value, shared by the fetched-tokenkeg cases
const MULTISIG = {
    isInitialized: true,
    m: 1,
    n: 1,
    signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
};

describe('README flows: how payload types reach the consumer', () => {
    describe('codama IDLs', () => {
        describe('build time — a type is present', () => {
            it('should infer payloads from the IDL schema itself with zero generics', () => {
                // the schema is the type source — no generics, no companion types; the only requirement is
                // that the IDL is bundled as TS source (`as const`) so the compiler can read it.
                // The RootNode TS variant may already be accessible (shipped by the program, like vaultIdl)
                // or built in advance — run the anchor→codama conversion at build time and save the result.
                const client = createIdlClient(vaultIdl, { provider: codamaProvider() });
                //                             ^? vaultIdl: { readonly kind: "rootNode"; readonly program: { … readonly name: "deposit" … } } — every field is a literal

                // the instruction arrives from elsewhere (a transaction) — the fixture builds deposit(42)
                const [, data] = client.decodeInstructionData(depositIx(vaultIdl));
                //        ^? data: { amount: bigint; discriminator: number } | undefined — read off the schema's `deposit` instruction

                expectTypeOf(data).toEqualTypeOf<{ amount: bigint; discriminator: number } | undefined>();
                expect(data).toEqual({ amount: 42n, discriminator: 1 });
            });

            it('should infer parser-shaped field types where they differ from codec-level expectations', () => {
                // a generated codama IDL (converted wormhole NTT) — its config account collects every
                // field shape that surprises people coming from generated clients or anchor coders
                const client = createIdlClient(exampleNativeTokenTransfersIdl, { provider: codamaProvider() });
                //                             ^? exampleNativeTokenTransfersIdl: { readonly kind: "rootNode"; … } — a generated literal, same guidance as hand-written
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
                //        ^? union over every account the schema declares
                // AccountsDataOf keys the same payloads by account name — pick the member you mean
                type ConfigAccount = AccountsDataOf<typeof exampleNativeTokenTransfersIdl>['config'];

                // the whole inferred account in one place — each surprising shape shows its transformation
                expectTypeOf<ConfigAccount>().toEqualTypeOf<{
                    discriminator: [string, string]; // bytes → [encoding, data] tuple, NOT Uint8Array
                    bump: number; // u8 → number
                    owner: string; // Address/pubkey → plain base58 string, NOT a branded Address
                    pendingOwner: { __option: 'None' } | { __option: 'Some'; value: string }; // Option<pubkey> → kit {__option} object, NOT `string | null`
                    mint: string; // Address/pubkey → string
                    tokenProgram: string; // Address/pubkey → string
                    mode: number; // scalar enum → its variant INDEX, NOT the variant name
                    chainId: { id: number }; // defined type → resolved inline
                    nextTransceiverId: number;
                    threshold: number;
                    enabledTransceivers: { map: bigint }; // u128 (and u64/i64/i128) → bigint, NOT number
                    paused: boolean; // bool → boolean
                    custody: string;
                }>();

                expect(data).toMatchObject({
                    discriminator: base64('mwyq4B76zII='), // the same bytes, re-encoded as base64 by the parser
                    mode: 1, // 'burning' went in by name, its index came back out
                    owner: DEFAULT_ADDRESS,
                    pendingOwner: { __option: 'None' },
                });
            });

            it('should refine a fetched codama IDL with a generated client type via AsDecoded', () => {
                // the IDL arrives at runtime, but the TYPE was generated at build time (renderers-js) —
                // the consumer pairs them per call
                const tokenkeg = loadTokenkegIdl();
                const client = createIdlClient(tokenkeg, { provider: codamaProvider() });
                const bytes = encodeAccount(tokenkeg, 'multisig', MULTISIG);

                // the naive claim: the rendered client's own type describes the CODEC view —
                // signers: Address[], a branded promise the parser does not uphold
                const [, codecView] = client.decodeAccountData<Multisig>(bytes);
                //        ^? codecView: Multisig | undefined — trusted not verified, and subtly wrong
                expectTypeOf(codecView).toEqualTypeOf<Multisig | undefined>();

                // the right claim: AsDecoded (a library export) remaps the same generated type to what
                // the parser returns — branded Address → plain base58 string, bytes → [encoding, data]
                const [, refined] = client.decodeAccountData<AsDecoded<Multisig>>(bytes);
                //        ^? refined: { isInitialized: boolean; m: number; n: number; signers: string[] } | undefined
                expectTypeOf(refined).toEqualTypeOf<
                    { isInitialized: boolean; m: number; n: number; signers: string[] } | undefined
                >();
                expect(refined).toEqual(MULTISIG);
            });
        });

        describe('runtime — only the fetched JSON exists', () => {
            it('should keep decoding exact while typing payloads unknown for a fetched codama IDL', () => {
                // runtime acquisition (PMP fetch) — the wide CodamaIdl carries no literals
                const tokenkeg = loadTokenkegIdl();
                //    ^? tokenkeg: CodamaIdl — the wide RootNode; names and kinds are plain strings, nothing to infer from
                const client = createIdlClient(tokenkeg, { provider: codamaProvider() });
                const bytes = encodeAccount(tokenkeg, 'multisig', MULTISIG);

                // default inference degrades honestly: the value is exact at runtime, unknown statically
                const [, data] = client.decodeAccountData(bytes);
                //        ^? data: unknown — a wide IDL carries no literals to read
                expectTypeOf(data).toBeUnknown();
                expect(data).toMatchObject({ isInitialized: true, m: 1, n: 1 });
            });

            it('should carry the exact runtime schema alongside the statically unknown payload', () => {
                // the runtime counterpart of build-level typings: no type exists for a fetched IDL, but
                // the decode carries the matched schema node — consumers work schema-driven, not guessing
                const tokenkeg = loadTokenkegIdl();
                const client = createIdlClient(tokenkeg, { provider: codamaProvider() });
                const bytes = encodeAccount(tokenkeg, 'multisig', MULTISIG);

                // the two-step route: unwrap narrows to the default (codama) arm and surfaces the schema node
                const { data, node } = unwrap(client.decodeAccount(bytes));
                //            ^? node: AccountNode — the exact schema, at runtime
                expectTypeOf(data).toBeUnknown();
                //           ^? unknown statically — the schema below is the runtime substitute

                if (node.data.kind !== 'structTypeNode') throw new Error('expected a struct-shaped account');
                expect(node.name).toBe('multisig');
                // every field's declared kind is known exactly — rendering dispatches on it, never on the value
                expect(node.data.fields.map(field => `${field.name}: ${field.type.kind}`)).toEqual([
                    'm: numberTypeNode',
                    'n: numberTypeNode',
                    'isInitialized: booleanTypeNode',
                    'signers: arrayTypeNode',
                ]);
                // and nested kinds too: signers is an array OF pubkeys → render as address links
                const signers = node.data.fields.find(field => field.name === 'signers');
                expect(signers?.type.kind === 'arrayTypeNode' && signers.type.item.kind).toBe('publicKeyTypeNode');
            });
        });
    });

    describe('anchor IDLs (decoded through the same codama engine)', () => {
        describe('build time — a type is present', () => {
            it('should infer payloads from an anchor IDL paired with its satellite type', () => {
                // `anchor build` emits a TS satellite type next to the JSON — pairing them keeps the literals
                const simple = loadSimpleIdlTyped();
                //    ^? simple: Simple — the anchor-generated satellite type; names and arg types are literals
                const client = createIdlClient(simple, { provider: codamaProvider() });

                const [, data] = client.decodeInstructionData(incrementIx(simple));
                //        ^? data: { amount: bigint } | Record<string, never> | undefined — one member per declared instruction

                expectTypeOf(data).toEqualTypeOf<{ amount: bigint } | Record<string, never> | undefined>();
                expect(data).toMatchObject({ amount: 42n });
            });

            it('should infer payloads for an anchor IDL fetched with an explicit satellite generic', async () => {
                // the same pairing made explicit at the acquisition point: anchor's own
                // Program.fetchIdl<T> generic stamps the satellite type onto the fetched IDL
                const simple031 = await fetchAnchorIdl<Simple031>();
                //    ^? simple031: Simple031 — the satellite type, stamped by the fetch generic
                const client = createIdlClient(simple031, { provider: codamaProvider() });

                const [, data] = client.decodeInstructionData(incrementIx(simple031));
                //        ^? data: { amount: bigint } | Record<string, never> | undefined — same guidance, explicit source

                expectTypeOf(data).toEqualTypeOf<{ amount: bigint } | Record<string, never> | undefined>();
                expect(data).toMatchObject({ amount: 42n });
            });
        });

        describe('runtime — only the fetched JSON exists', () => {
            it('should keep decoding exact while typing payloads unknown for a bare anchor IDL', () => {
                // runtime acquisition with no satellite type — the wide AnchorIdl carries no literals
                const wide: Idl = loadSimpleIdl();
                //    ^? wide: Idl — anchor's own wide IDL type; instruction names/args are plain strings
                const client = createIdlClient(wide, { provider: codamaProvider() });

                // default inference degrades honestly: the value is exact at runtime, unknown statically
                const [, data] = client.decodeInstructionData(incrementIx(wide));
                //        ^? data: unknown — a wide IDL carries no literals to read
                expectTypeOf(data).toBeUnknown();
                expect(data).toMatchObject({ amount: 42n });

                // the per-call escape hatch: the consumer claims the shape where they know it —
                // the claim is compile-time only, the runtime value may carry more fields than claimed
                const [, claimed] = client.decodeInstructionData<{ amount: bigint }>(incrementIx(wide));
                //        ^? claimed: { amount: bigint } | undefined — exactly what was claimed, trusted not verified
                expectTypeOf(claimed).toEqualTypeOf<{ amount: bigint } | undefined>();
                expect(claimed).toMatchObject({ amount: 42n });
            });

            it('should create the runtime schema from the anchor JSON through the internal conversion', () => {
                // the anchor twin of the codama schema flow: no codama IDL ever existed here — the engine
                // converts the anchor JSON internally (nodes-from-anchor), so the decode still carries an
                // exact codama schema for the anchor-born program
                const wide: Idl = loadSimpleIdl();
                const client = createIdlClient(wide, { provider: codamaProvider() });

                const { data, node } = unwrap(client.decodeInstruction(incrementIx(wide)));
                //            ^? node: InstructionNode — born from the anchor JSON
                expectTypeOf(data).toBeUnknown();
                //           ^? unknown statically — same rule as any runtime IDL

                expect(node.name).toBe('increment');
                // the converted schema is exact: the declared discriminator plus each argument's kind
                expect(node.arguments.map(argument => `${argument.name}: ${argument.type.kind}`)).toEqual([
                    'discriminator: fixedSizeTypeNode',
                    'amount: numberTypeNode',
                ]);
            });
        });
    });
});
