// Pins what the helpers RETURN for each IDL standard — vitest typecheck only, nothing executes.
import type { Instruction } from '@solana/kit';
import { describe, expectTypeOf, it } from 'vitest';

import {
    createIdlClient,
    type IdlClient,
    type IdlMetaClient,
    isAnchorStandard,
    isCodamaStandard,
    tryCreateIdlClient,
} from '../client';
import { codamaProvider } from '../codama/index';
import { convertToCodama } from '../anchor/convert';
import { decodeAccountWithIdl } from '../codama/decode-account';
import { decodeInstructionWithIdl } from '../codama/decode-instruction';
import { getIdlStandard, getIdlVersion, isAnchorIdl, isCodamaIdl, isSupportedIdl } from '../detect';
import type { AccountDataOf, InstructionDataOf } from '../infer';
import {
    IDL_ERROR__ACCOUNT_DECODE_FAILED,
    IDL_ERROR__IDL_PARSE_FAILED,
    IDL_ERROR__INSTRUCTION_DECODE_FAILED,
    IDL_ERROR__UNSUPPORTED_IDL_FORMAT,
    IdlError,
    isIdlError,
    type Result,
} from '../errors';
import { buildInstructionNameResolver, buildProgramName } from '../names';
import {
    type AccountDecode,
    type AccountDecodeFor,
    type AnchorIdl,
    type CodamaDecodedAccount,
    type CodamaDecodedInstruction,
    type CodamaIdl,
    IdlStandard,
    type IdlVersion,
    type InstructionDecode,
    type InstructionDecodeFor,
    type InstructionHandlers,
    type SupportedIdl,
} from '../types';
import { incrementIx, loadSimpleIdl, loadTokenkegIdl, type Simple, type Simple031 } from './fixtures';

// Wide runtime documents (this file is typecheck-only — nothing executes).
const anchorIdl = loadSimpleIdl();
const codamaIdl = loadTokenkegIdl();
const anchorIncrementIx = incrementIx(anchorIdl);

// A literal document (the shape anchor-generated types have) for pinning IDL-derived inference.
type ProbeIdl = {
    address: 'Probe111111111111111111111111111111111111111';
    accounts: [{ discriminator: [2]; name: 'vault' }];
    instructions: [{ accounts: []; args: [{ name: 'amount'; type: 'u64' }]; discriminator: [1]; name: 'deposit' }];
    metadata: { name: 'probe'; spec: '0.1.0'; version: '0.1.0' };
    types: [{ name: 'vault'; type: { fields: [{ name: 'balance'; type: 'u64' }]; kind: 'struct' } }];
};
declare const probeIdl: ProbeIdl;
declare const probeDepositIx: Instruction;

describe('createIdlClient inference', () => {
    it('should infer the client type parameter from a typed IDL argument', () => {
        const provider = codamaProvider();
        expectTypeOf(createIdlClient(codamaIdl, { provider })).toEqualTypeOf<IdlClient<CodamaIdl>>();
        expectTypeOf(createIdlClient(anchorIdl, { provider })).toEqualTypeOf<IdlClient<AnchorIdl>>();
        expectTypeOf(createIdlClient(anchorIdl as SupportedIdl, { provider })).toEqualTypeOf<IdlClient<SupportedIdl>>();
    });

    it('should return the engine-free metadata client without a provider — no decode surface', () => {
        expectTypeOf(createIdlClient(codamaIdl)).toEqualTypeOf<IdlMetaClient<CodamaIdl>>();
        expectTypeOf(createIdlClient(anchorIdl)).not.toHaveProperty('decodeInstruction');
        expectTypeOf(createIdlClient(anchorIdl)).not.toHaveProperty('decodeAccount');
        expectTypeOf(createIdlClient(anchorIdl)).not.toHaveProperty('getDecodedData');
    });

    it('should keep the idl property at the inferred standard', () => {
        expectTypeOf(createIdlClient(codamaIdl).idl).toEqualTypeOf<CodamaIdl>();
        expectTypeOf(createIdlClient(anchorIdl).idl).toEqualTypeOf<AnchorIdl>();
    });

    it('should type the metadata helpers as optional strings', () => {
        const client = createIdlClient(anchorIdl);
        expectTypeOf(client.programAddress()).toEqualTypeOf<string | undefined>();
        expectTypeOf(client.programName()).toEqualTypeOf<string | undefined>();
        expectTypeOf(client.programVersion()).toEqualTypeOf<string | undefined>();
        expectTypeOf(client.formatVersion()).toEqualTypeOf<IdlVersion>();
        expectTypeOf(client.instructionName(new Uint8Array())).toEqualTypeOf<string | undefined>();
    });
});

describe('decode result inference', () => {
    it('should narrow the Codama client instruction decode to the codama and unknown arms', () => {
        const client = createIdlClient(codamaIdl, { provider: codamaProvider() });
        expectTypeOf(client.decodeInstruction(anchorIncrementIx)).toEqualTypeOf<
            Exclude<InstructionDecode, { kind: IdlStandard.Anchor }>
        >();
    });

    it('should keep all instruction decode arms for the Anchor client (codama fallback stays possible)', () => {
        const client = createIdlClient(anchorIdl, { provider: codamaProvider() });
        expectTypeOf(client.decodeInstruction(anchorIncrementIx)).toEqualTypeOf<InstructionDecode>();
    });

    it('should narrow account decodes the same way', () => {
        const provider = codamaProvider();
        expectTypeOf(createIdlClient(codamaIdl, { provider }).decodeAccount(new Uint8Array())).toEqualTypeOf<
            Exclude<AccountDecode, { kind: IdlStandard.Anchor }>
        >();
        expectTypeOf(
            createIdlClient(anchorIdl, { provider }).decodeAccount(new Uint8Array()),
        ).toEqualTypeOf<AccountDecode>();
    });

    it('should infer the handler-map return type as R', () => {
        const client = createIdlClient(codamaIdl, { provider: codamaProvider() });
        const result = client.decodeInstruction(anchorIncrementIx, {
            codama: () => 'decoded' as const,
            unknown: () => 'failed' as const,
        });
        expectTypeOf(result).toEqualTypeOf<'decoded' | 'failed'>();
    });

    it('should pass each handler its narrowed decode arm', () => {
        const client = createIdlClient(anchorIdl, { provider: codamaProvider() });
        client.decodeInstruction(anchorIncrementIx, {
            anchor: decode =>
                expectTypeOf(decode).toEqualTypeOf<{
                    decoded: unknown;
                    kind: IdlStandard.Anchor;
                    recoveredFrom?: readonly IdlError[];
                }>(),
            codama: decode =>
                expectTypeOf(decode).toEqualTypeOf<{ decoded: CodamaDecodedInstruction; kind: IdlStandard.Codama }>(),
            unknown: decode => expectTypeOf(decode).toEqualTypeOf<{ errors: readonly IdlError[]; kind: 'unknown' }>(),
        });
    });

    it('should not require an anchor handler on a Codama client handler map', () => {
        expectTypeOf<keyof InstructionHandlers<CodamaIdl, void>>().toEqualTypeOf<IdlStandard.Codama | 'unknown'>();
        expectTypeOf<keyof InstructionHandlers<AnchorIdl, void>>().toEqualTypeOf<IdlStandard | 'unknown'>();
    });

    it('should require the anchor handler on an Anchor client handler map', () => {
        // anchor is reachable in an Anchor client's union, so the arm is required
        const partial = {
            codama: (_decode: Extract<InstructionDecode, { kind: IdlStandard.Codama }>) => 1,
            unknown: (_decode: Extract<InstructionDecode, { kind: 'unknown' }>) => 1,
        };
        expectTypeOf(partial).not.toMatchTypeOf<InstructionHandlers<AnchorIdl, number>>();
    });

    it('should type the standalone decode functions by the IDL argument', () => {
        expectTypeOf(decodeInstructionWithIdl(codamaIdl, anchorIncrementIx)).toEqualTypeOf<
            InstructionDecodeFor<CodamaIdl>
        >();
        expectTypeOf(decodeAccountWithIdl(anchorIdl, new Uint8Array())).toEqualTypeOf<AccountDecodeFor<AnchorIdl>>();
    });

    it('should type the conversion as an error-first result declaring its only failure code', () => {
        expectTypeOf(convertToCodama(anchorIdl)).toEqualTypeOf<Result<CodamaIdl, typeof IDL_ERROR__IDL_PARSE_FAILED>>();
        // @ts-expect-error the conversion takes Anchor documents only — Codama roots need no conversion
        convertToCodama(codamaIdl);
    });
});

describe('decoder payload inference', () => {
    it('should type the codama arms with the engine payloads and the anchor arms as opaque', () => {
        expectTypeOf<
            Extract<InstructionDecode, { kind: IdlStandard.Codama }>['decoded']
        >().toEqualTypeOf<CodamaDecodedInstruction>();
        expectTypeOf<
            Extract<AccountDecode, { kind: IdlStandard.Codama }>['decoded']
        >().toEqualTypeOf<CodamaDecodedAccount>();
        expectTypeOf<Extract<InstructionDecode, { kind: IdlStandard.Anchor }>['decoded']>().toEqualTypeOf<unknown>();
        expectTypeOf<Extract<AccountDecode, { kind: IdlStandard.Anchor }>['decoded']>().toEqualTypeOf<unknown>();
    });

    it('should pass account handlers their narrowed decode arms', () => {
        const client = createIdlClient(anchorIdl, { provider: codamaProvider() });
        client.decodeAccount(new Uint8Array(), {
            anchor: decode => expectTypeOf(decode).toEqualTypeOf<{ decoded: unknown; kind: IdlStandard.Anchor }>(),
            codama: decode =>
                expectTypeOf(decode).toEqualTypeOf<{ decoded: CodamaDecodedAccount; kind: IdlStandard.Codama }>(),
            unknown: decode => expectTypeOf(decode).toEqualTypeOf<{ errors: readonly IdlError[]; kind: 'unknown' }>(),
        });
    });

    it('should infer getDecodedData payloads from a literal IDL document', () => {
        const client = createIdlClient(probeIdl, { provider: codamaProvider() });
        const decode = client.decodeInstruction(probeDepositIx);

        expectTypeOf(client.getDecodedData(decode)).toEqualTypeOf<{ amount: bigint } | undefined>();
        expectTypeOf(client.getDecodedData(client.decodeAccount(new Uint8Array()))).toEqualTypeOf<
            { balance: bigint } | undefined
        >();

        // narrowing the arm first drops undefined
        if (decode.kind === IdlStandard.Codama) {
            expectTypeOf(client.getDecodedData(decode)).toEqualTypeOf<{ amount: bigint }>();
        }
    });

    it('should infer arguments and accounts from the anchor-generated companion types', () => {
        // anchor's target/types view — args union covers every instruction (increment({amount}) |
        // initialize (no args → empty struct)), accounts map to their struct fields
        expectTypeOf<InstructionDataOf<Simple>>().toEqualTypeOf<{ amount: bigint } | Record<string, never>>();
        expectTypeOf<AccountDataOf<Simple>>().toEqualTypeOf<{ authority: string; count: bigint }>();
        expectTypeOf<InstructionDataOf<Simple031>>().toEqualTypeOf<{ amount: bigint } | Record<string, never>>();
        expectTypeOf<AccountDataOf<Simple031>>().toEqualTypeOf<{ authority: string; count: bigint }>();
    });

    it('should decode anchor bytes args as [encoding, data] tuples (the codama pipeline shape)', () => {
        // no built fixture declares a bytes arg — pin the anchor arm against the codama runtime shape
        type BytesProbe = {
            address: 'Bytes11111111111111111111111111111111111111';
            accounts: [];
            instructions: [
                {
                    accounts: [];
                    args: [{ name: 'blob'; type: 'bytes' }, { name: 'owner'; type: 'pubkey' }];
                    discriminator: [1];
                    name: 'store';
                },
            ];
            metadata: { name: 'bytes'; spec: '0.1.0'; version: '0.1.0' };
            types: [];
        };
        expectTypeOf<InstructionDataOf<BytesProbe>>().toEqualTypeOf<{ blob: [string, string]; owner: string }>();
    });

    it('should degrade to unknown for wide runtime documents and accept a per-call override', () => {
        // anchorIdl is typed as the wide AnchorIdl — the runtime-fetched situation
        const client = createIdlClient(anchorIdl, { provider: codamaProvider() });
        const decode = client.decodeInstruction(anchorIncrementIx);

        expectTypeOf(client.getDecodedData(decode)).toEqualTypeOf<unknown>();
        expectTypeOf(client.getDecodedData(client.decodeAccount(new Uint8Array()))).toEqualTypeOf<unknown>();
        expectTypeOf(client.getDecodedData<{ amount: bigint }>(decode)).toEqualTypeOf<{ amount: bigint } | undefined>();
    });

    it('should type the combined decode methods as error-first results', () => {
        const client = createIdlClient(probeIdl, { provider: codamaProvider() });

        expectTypeOf(client.decodeInstructionData(probeDepositIx)).toEqualTypeOf<Result<{ amount: bigint }>>();
        expectTypeOf(client.decodeAccountData(new Uint8Array())).toEqualTypeOf<Result<{ balance: bigint }>>();
        // the per-call override and the kind assertion compose
        expectTypeOf(client.decodeAccountData<{ raw: string }>(new Uint8Array(), IdlStandard.Codama)).toEqualTypeOf<
            Result<{ raw: string }>
        >();
    });
});

describe('tryCreateIdlClient inference', () => {
    it('should return an error-first result declaring the only failure code it can produce', () => {
        expectTypeOf(tryCreateIdlClient({} as unknown)).toEqualTypeOf<
            Result<IdlMetaClient, typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT>
        >();
        expectTypeOf(tryCreateIdlClient({} as unknown, { provider: codamaProvider() })).toEqualTypeOf<
            Result<IdlClient, typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT>
        >();
    });

    it('should narrow the tuple by checking the error slot', () => {
        const [error, client] = tryCreateIdlClient({} as unknown, { provider: codamaProvider() });
        if (error === undefined) {
            expectTypeOf(client).toEqualTypeOf<IdlClient>();
        } else {
            expectTypeOf(error).toEqualTypeOf<IdlError<typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT>>();
            expectTypeOf(client).toEqualTypeOf<undefined>();
        }
    });
});

describe('IdlError inference', () => {
    it('should narrow the code AND the context type through isIdlError', () => {
        const e: unknown = new Error('anything');
        if (isIdlError(e, IDL_ERROR__INSTRUCTION_DECODE_FAILED)) {
            expectTypeOf(e.code).toEqualTypeOf<typeof IDL_ERROR__INSTRUCTION_DECODE_FAILED>();
            expectTypeOf(e.context).toEqualTypeOf<{ programAddress: string; standard: IdlStandard }>();
        }
        if (isIdlError(e, IDL_ERROR__UNSUPPORTED_IDL_FORMAT)) {
            expectTypeOf(e.context).toEqualTypeOf<undefined>();
        }
    });

    it('should require context exactly when the code declares one', () => {
        new IdlError(IDL_ERROR__UNSUPPORTED_IDL_FORMAT);
        new IdlError(IDL_ERROR__ACCOUNT_DECODE_FAILED, { dataLength: 8, standard: IdlStandard.Codama });
        // @ts-expect-error a coded context is mandatory for codes that declare one
        new IdlError(IDL_ERROR__ACCOUNT_DECODE_FAILED);
        // @ts-expect-error context fields must match the code's declared shape
        new IdlError(IDL_ERROR__ACCOUNT_DECODE_FAILED, { wrong: true });
    });
});

describe('standard guard narrowing', () => {
    it('should narrow the client through isAnchorStandard / isCodamaStandard', () => {
        const client = createIdlClient(codamaIdl as SupportedIdl, { provider: codamaProvider() });
        if (isCodamaStandard(client)) {
            expectTypeOf(client.idl).toEqualTypeOf<CodamaIdl>();
            expectTypeOf(client.decodeInstruction(anchorIncrementIx)).toEqualTypeOf<
                Exclude<InstructionDecode, { kind: IdlStandard.Anchor }>
            >();
        }
        if (isAnchorStandard(client)) {
            expectTypeOf(client.idl).toEqualTypeOf<AnchorIdl>();
        }
    });

    it('should narrow unknown input through the IDL guards', () => {
        const value: unknown = {};
        if (isCodamaIdl(value)) expectTypeOf(value).toEqualTypeOf<CodamaIdl>();
        if (isAnchorIdl(value)) expectTypeOf(value).toEqualTypeOf<AnchorIdl>();
        if (isSupportedIdl(value)) expectTypeOf(value).toEqualTypeOf<SupportedIdl>();
    });
});

describe('detection and names helper returns', () => {
    it('should return the enum and version label types', () => {
        expectTypeOf(getIdlStandard(anchorIdl)).toEqualTypeOf<IdlStandard>();
        expectTypeOf(getIdlVersion(codamaIdl)).toEqualTypeOf<IdlVersion>();
    });

    it('should return optional names and an optional resolver', () => {
        expectTypeOf(buildProgramName(codamaIdl)).toEqualTypeOf<string | undefined>();
        expectTypeOf(buildInstructionNameResolver(anchorIdl)).toEqualTypeOf<
            ((data: Uint8Array) => string | undefined) | undefined
        >();
    });
});

describe('client options', () => {
    it('should type the injectable legacy decoder against kit instructions', () => {
        createIdlClient(anchorIdl, {
            provider: codamaProvider(),
            legacyAnchorDecoder: (idl, ix) => {
                expectTypeOf(idl).toEqualTypeOf<AnchorIdl>();
                expectTypeOf(ix).toEqualTypeOf<Instruction>();
                return undefined;
            },
        });
    });
});
