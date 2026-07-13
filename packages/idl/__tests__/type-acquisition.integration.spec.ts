// The type-acquisition model over the default codama engine:
//   literal → static types; runtime IDL → exact runtime schema, unknown statically;
//   semantics beyond the schema → only enrichment helps (nothing infers what was never written down).
// One describe per row. The known-IDL rows use wormhole NTT (a legacy anchor program) with types
// generated in advance from the document; the unknown-IDL row walks the runtime schema for both
// origins — an anchor document converted on the fly and a fetched codama root (SPL Token).
import {
    type AccountDecode,
    type AnchorIdl,
    type CodamaIdl,
    createIdlClient,
    type DecodedEntry,
    getDecodedEntries,
    IdlStandard,
    type InstructionDecode,
} from '@explorer/idl';
import { convertToCodama } from '@explorer/idl/anchor';
import { exampleNativeTokenTransfersIdl } from '@explorer/test-idl-program-example-native-token-transfers/codama';
import nttjson from '@explorer/test-idl-program-example-native-token-transfers/idl';
import { address, type Instruction } from '@solana/kit';
import { getLastNodeFromPath } from 'codama';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    loadNtt029Idl,
    loadTokenkegIdl,
    NTT_PROGRAM_ADDRESS,
    NTT_TRANSFER_BURN_DISCRIMINATOR,
    transferIx,
    u64le,
} from '../src/__tests__/fixtures';
import { unwrap } from '../src/__tests__/unwrap';
import { DEFAULT_ADDRESS, encodeAccount } from './codama-helpers';

/* eslint-disable @typescript-eslint/consistent-type-assertions -- the legacy JSON rides the same casts real consumers use: AnchorIdl into the converter, the generated companion type onto the converted root */

/** The build-time artifact: the converted root written down as source (`as const`) — value and type at once. */
type NttCodamaIdl = typeof exampleNativeTokenTransfersIdl;

// the JSON import of the SAME document widens — names lose their literals, so inference has nothing to read
type NttCodamaJson = typeof nttjson;

/** The transferBurn payload as infer.ts derives it from the literal — shared by both known-IDL rows. */
type TransferBurnData = {
    args: {
        amount: bigint;
        recipientAddress: [string, string];
        recipientChain: { id: number };
        shouldQueue: boolean;
    };
    discriminator: [string, string];
};

/** A complete transferBurn instruction: TransferArgs{amount 42, chain 1, 32-byte recipient, no queue}. */
const transferBurnIx: Instruction & { accounts: []; data: Uint8Array } = {
    accounts: [],
    data: new Uint8Array([
        ...NTT_TRANSFER_BURN_DISCRIMINATOR,
        ...u64le(42n),
        1,
        0, // recipientChain.id (u16 le)
        ...Array.from({ length: 32 }, () => 7), // recipientAddress
        0, // shouldQueue
    ]),
    programAddress: address(NTT_PROGRAM_ADDRESS),
};

/**
 * Aaron's renderField over `getDecodedEntries`: the library owns the traversal (links, wrappers,
 * options, nesting) — only per-leaf formatting stays consumer-side, keyed by the entry's node kind.
 */
function renderEntry({ node, value }: DecodedEntry): string {
    switch (node.kind) {
        case 'publicKeyTypeNode':
            return `address(${String(value)})`;
        case 'numberTypeNode':
            return `${node.format}(${String(value)})`;
        case 'booleanTypeNode':
            return value ? 'yes' : 'no';
        case 'bytesTypeNode':
            // dynamic-parsers hands bytes back as an [encoding, data] tuple
            return Array.isArray(value) ? `bytes(${String(value[1])})` : String(value);
        case 'enumTypeNode': {
            // decoded as the variant index — the node's variants restore the display name
            const variant = node.variants[Number(value)];
            return variant ? String(variant.name) : String(value);
        }
        default:
            // an option that decoded to None is the only undefined-valued entry
            return value === undefined ? 'none' : (JSON.stringify(value) ?? String(value));
    }
}

const renderEntries = (decode: AccountDecode | InstructionDecode): string[] =>
    getDecodedEntries(decode).map(entry => `${entry.path.join('.')}: ${renderEntry(entry)}`);

describe('integration: type acquisition — literal → static types; runtime IDL → runtime schema', () => {
    describe('known IDL, no types provided — the document literal is the type source', () => {
        /** Case: the generated codama literal IS the type source — payloads infer with zero generics. */
        it('should infer transferBurn args automatically from the generated literal', () => {
            const client = createIdlClient(exampleNativeTokenTransfersIdl);

            const decode = client.decodeInstruction(transferBurnIx);
            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = client.getDecodedData(decode);

            // the inferred union spans all 31 instructions — the transferBurn member carries the full shape
            expectTypeOf<Extract<typeof result, { args: { amount: bigint } }>>().toEqualTypeOf<TransferBurnData>();
            expect(getLastNodeFromPath(decode.decoded.path).name).toBe('transferBurn');
            expect(result).toMatchObject({
                args: { amount: 42n, recipientChain: { id: 1 }, shouldQueue: false },
            });
        });
    });

    describe('known IDL, types generated in advance — the runtime JSON asserted as the companion type', () => {
        /** Case: the runtime JSON route — convert the fetched legacy document, assert the companion type on it. */
        it('should carry the same inference when the runtime conversion is asserted as the companion type', () => {
            const root = unwrap(convertToCodama(loadNtt029Idl() as unknown as AnchorIdl));
            // legacy documents carry no program address — the consumer injects it from context
            const converted = {
                ...root,
                program: { ...root.program, publicKey: NTT_PROGRAM_ADDRESS },
            } as unknown as NttCodamaIdl;
            const client = createIdlClient(converted);

            const decode = client.decodeInstruction(transferBurnIx);
            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = client.getDecodedData(decode);

            // same asserted type — the compiler guidance is identical to the literal route
            expectTypeOf<Extract<typeof result, { args: { amount: bigint } }>>().toEqualTypeOf<TransferBurnData>();
            expect(getLastNodeFromPath(decode.decoded.path).name).toBe('transferBurn');
            expect(result).toMatchObject({
                args: { amount: 42n, recipientChain: { id: 1 }, shouldQueue: false },
            });
        });
    });

    describe('unknown IDL at runtime — exact schema in the decode, unknown statically', () => {
        /** Case: anchor origin — plain widened JSON converted on the fly; the node schema drives rendering. */
        it('should render config account fields from the node schema without claiming any payload type', () => {
            // plain widened JSON in, plain wide root out — the compiler knows nothing about this document
            expectTypeOf<NttCodamaJson['instructions'][number]['name']>().toEqualTypeOf<string>();
            const root = unwrap(convertToCodama(nttjson as unknown as AnchorIdl));
            const converted = {
                ...root,
                program: { ...root.program, publicKey: NTT_PROGRAM_ADDRESS },
            } as unknown as CodamaIdl;
            const client = createIdlClient(converted);

            // the literal fixture only drives the ENCODE side here (codama's own codec builds the bytes)
            const bytes = encodeAccount(exampleNativeTokenTransfersIdl, 'config', {
                bump: 254,
                chainId: { id: 1 },
                custody: DEFAULT_ADDRESS,
                discriminator: ['base16', '9b0caae01efacc82'], // the converted node's declared default: sha256('account:Config')[..8]
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

            const decode = client.decodeAccount(bytes);
            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            // nothing is claimed: the decoded payload is `unknown`, and stays that way
            expectTypeOf(decode.decoded.data).toBeUnknown();

            const account = getLastNodeFromPath(decode.decoded.path); // AccountNode — the schema
            const rendered = renderEntries(decode); // no cast — entries pair each leaf with its node

            expect(account.name).toBe('config');
            expect(rendered).toEqual([
                'discriminator: bytes(mwyq4B76zII=)',
                'bump: u8(254)',
                `owner: address(${DEFAULT_ADDRESS})`,
                'pendingOwner: none',
                `mint: address(${DEFAULT_ADDRESS})`,
                `tokenProgram: address(${DEFAULT_ADDRESS})`,
                'mode: burning', // decoded as index 1 — the enum node restored the variant name
                'chainId.id: u16(1)', // nested fields flatten into dot paths
                'nextTransceiverId: u8(1)',
                'threshold: u8(1)',
                'enabledTransceivers.map: u128(1)',
                'paused: no',
                `custody: address(${DEFAULT_ADDRESS})`,
            ]);
        });

        /** Case: codama origin — a fetched root (SPL Token PMP snapshot); same schema walk, no conversion. */
        it('should render transfer instruction args from the node schema of a fetched codama root', () => {
            const tokenkeg = loadTokenkegIdl(); // wide CodamaIdl — runtime acquisition, no literal anywhere
            const client = createIdlClient(tokenkeg);

            const decode = client.decodeInstruction(transferIx(tokenkeg));
            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            // statically unknown on BOTH surfaces: the raw payload and the inference route
            expectTypeOf(decode.decoded.data).toBeUnknown();
            expectTypeOf(client.getDecodedData(decode)).toBeUnknown();

            const instruction = getLastNodeFromPath(decode.decoded.path); // InstructionNode — the schema
            const rendered = renderEntries(decode); // no cast — entries pair each leaf with its node

            expect(instruction.name).toBe('transfer');
            expect(rendered).toEqual(['discriminator: u8(3)', 'amount: u64(42)']);
        });
    });
});
