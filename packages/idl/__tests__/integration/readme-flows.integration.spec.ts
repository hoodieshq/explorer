// README-level consumer flows — one case per way a user meets the library, written to be lifted
// into the README verbatim. Same engine everywhere (the default codama engine); the axes are the input standard
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
//   schema-paired entries (its own section) — 10. getDecodedEntries flattens the codama arm into
//                  node-paired leaves; 11. one entries shape serves anchor-born programs too
// `decodeInstructionData`/`decodeAccountData` are the one-step routes (typed payload as an
// error-first Result); `unwrap` narrows the two-step route to the default (codama) arm (payload + schema node).
import {
    type AccountsDataOf,
    type AsDecoded,
    createIdlClient,
    findEntryOfKind,
    getDecodedEntries,
    joinPath,
    unwrap,
} from '@explorer/idl';
import { exampleNativeTokenTransfersIdl } from '@explorer/test-idl-program-example-native-token-transfers/codama';
import { vaultIdl } from '@explorer/test-idl-program-vault';
// the wide anchor IDL type is anchor's own — the library's AnchorIdl is a direct alias of it
import type { Idl } from '@coral-xyz/anchor';
import {
    address,
    appendTransactionMessageInstruction,
    blockhash,
    compileTransactionMessage,
    createTransactionMessage,
    pipe,
    setTransactionMessageFeePayer,
    setTransactionMessageLifetimeUsingBlockhash,
} from '@solana/kit';
// consumer-side package (a devDependency here only) — proves interop without the library depending on it
import { getInstructionsFromCompiledTransactionMessage, walkInstructions } from '@solana/transaction-introspection';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    depositIx,
    incrementIx,
    loadSimpleIdl,
    loadSimpleIdlTyped,
    loadTokenkegIdl,
    type Simple031,
    transferIx,
} from '../../src/__tests__/fixtures';
import { fetchAnchorIdl } from '../anchor-helpers';
import { base16, base64, DEFAULT_ADDRESS, encodeAccount } from '../codama-helpers';
// renderers-js output for SPL Token — type-only import, erased at runtime
import type { Multisig } from '../generated/token-client/accounts/multisig';

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
                const client = createIdlClient(vaultIdl);
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
                const client = createIdlClient(exampleNativeTokenTransfersIdl);
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
                const client = createIdlClient(tokenkeg);
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
                const client = createIdlClient(tokenkeg);
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
                const client = createIdlClient(tokenkeg);
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
                const client = createIdlClient(simple);

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
                const client = createIdlClient(simple031);

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
                const client = createIdlClient(wide);

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
                const client = createIdlClient(wide);

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

describe('README flows: schema-paired entries for unknown programs', () => {
    /** Case: a fetched codama root — getDecodedEntries flattens the decode into leaves, each paired with its schema node. */
    it('should flatten a codama decode into node-paired entries', () => {
        const tokenkeg = loadTokenkegIdl(); // wide CodamaIdl — no payload type exists anywhere
        const client = createIdlClient(tokenkeg);

        const decode = client.decodeInstruction(transferIx(tokenkeg));
        const entries = getDecodedEntries(decode);
        //    ^? DecodedEntry[] — { path, node, value } per leaf; a non-codama arm throws the typed kind-mismatch error

        // the path is the field's key — one row per leaf, nested fields flattened to dot paths
        expect(entries.map(joinPath)).toEqual(['discriminator', 'amount']);

        // or select leaves by what they ARE — no shape known upfront (e.g. every address in a payload)
        expect(entries.filter(({ node }) => node.kind === 'numberTypeNode')).toHaveLength(2);

        // the node says how to read the value: `transfer`'s amount is declared u64…
        const amount = findEntryOfKind(entries, 'amount', 'numberTypeNode');
        expect(amount?.node.format).toBe('u64'); // …typed straight off the narrowed node — no manual narrowing
        expect(amount?.value).toBe(42n); // …and the value already arrived in that format's runtime shape (bigint)
    });

    /** Case: an anchor JSON goes through the same call — the internal conversion pairs its leaves with codama nodes too. */
    it('should serve anchor-born programs with the same entries shape', () => {
        const simple = loadSimpleIdl(); // wide anchor JSON — converted internally by the engine
        const client = createIdlClient(simple);

        const decode = client.decodeInstruction(incrementIx(simple));
        const entries = getDecodedEntries(decode);

        // the same flattened keys — the anchor origin is invisible in the entries shape
        expect(entries.map(joinPath)).toEqual(['discriminator', 'amount']);

        // codama schema nodes even for the anchor-born program — one renderer serves both standards
        // (size wrappers are penetrated: the fixedSize(bytes) discriminator resolves to its bytes node)
        expect(findEntryOfKind(entries, 'discriminator', 'bytesTypeNode')).toBeDefined();

        // and the same leaf read as the codama case: anchor's u64 declaration survives the conversion…
        const amount = findEntryOfKind(entries, 'amount', 'numberTypeNode');
        expect(amount?.node.format).toBe('u64');
        expect(amount?.value).toBe(42n); // …so the value arrives in the same runtime shape (bigint)
    });
});

describe('README flows: interop with transaction introspection', () => {
    // @solana/transaction-introspection turns a confirmed transaction into kit Instructions, and this
    // library's decodeInstruction CONSUMES kit Instructions — so introspection output feeds it directly,
    // no dependency taken (the package is a devDependency here only, to prove the seam). Every transaction
    // below is assembled and compiled in memory, so the suite issues no RPC call.
    // a stand-in wallet — any address distinct from the invoked program works (the vault program is the
    // all-1s placeholder DEFAULT_ADDRESS, so the fee payer must not be that)
    const FEE_PAYER = 'UKrXU5bFrTzrqqpZXs8GVDbp4xPweiM65ADXNAy3ddR';
    const compileManualTransaction = (instruction: ReturnType<typeof depositIx>) =>
        compileTransactionMessage(
            pipe(
                createTransactionMessage({ version: 0 }),
                message => setTransactionMessageFeePayer(address(FEE_PAYER), message),
                message =>
                    setTransactionMessageLifetimeUsingBlockhash(
                        { blockhash: blockhash(DEFAULT_ADDRESS), lastValidBlockHeight: 0n },
                        message,
                    ),
                message => appendTransactionMessageInstruction(instruction, message),
            ),
        );

    it('should decode an instruction resolved from a compiled message without walking', () => {
        const client = createIdlClient(vaultIdl);
        // deposit(42) rides in a compiled transaction — the instruction a wallet would have sent
        const compiledMessage = compileManualTransaction(depositIx(vaultIdl));

        // getInstructionsFromCompiledTransactionMessage resolves the outer instructions as kit
        // Instructions — no transaction meta, no RPC
        const [instruction] = getInstructionsFromCompiledTransactionMessage(compiledMessage);

        // it drops straight into decodeInstructionData; inference is unchanged from a direct instruction
        const [, data] = client.decodeInstructionData(instruction);
        //        ^? { amount: bigint; discriminator: number } | undefined — read off vaultIdl's `deposit`
        expectTypeOf(data).toEqualTypeOf<{ amount: bigint; discriminator: number } | undefined>();
        expect(data).toEqual({ amount: 42n, discriminator: 1 });
    });

    it('should decode an instruction surfaced by walkInstructions', () => {
        const client = createIdlClient(vaultIdl);
        const compiledMessage = compileManualTransaction(depositIx(vaultIdl));

        // walkInstructions is the fuller entry: outer instructions followed by their inner CPI results,
        // each tagged with its position. deposit makes no CPIs, so an empty meta suffices — hand-built so
        // the suite calls no getTransaction.
        const meta = { innerInstructions: [] } as unknown as Parameters<typeof walkInstructions>[0]['meta'];
        const [outer] = walkInstructions({ compiledMessage, loadedAddresses: { readonly: [], writable: [] }, meta });

        expect(outer.trace).toEqual({ index: 0, kind: 'outer' });

        const [, data] = client.decodeInstructionData(outer);
        expect(data).toEqual({ amount: 42n, discriminator: 1 });
    });
});
