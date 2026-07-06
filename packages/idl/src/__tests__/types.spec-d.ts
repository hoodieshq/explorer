// Pins what the helpers RETURN for each IDL standard — vitest typecheck only, nothing executes.
import type { Instruction } from '@solana/kit';
import { describe, expectTypeOf, it } from 'vitest';

import {
    createIdlClient,
    getDecodedData,
    type IdlClient,
    isAnchorStandard,
    isCodamaStandard,
    tryCreateIdlClient,
} from '../client';
import { convertToCodama } from '../convert';
import { decodeAccountWithIdl } from '../decode-account';
import { decodeInstructionWithIdl } from '../decode-instruction';
import { getIdlStandard, getIdlVersion, isAnchorIdl, isCodamaIdl, isSupportedIdl } from '../detect';
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
import { anchorIdl, anchorIncrementIx, codamaIdl } from './fixtures';

describe('createIdlClient inference', () => {
    it('should infer the client type parameter from a typed IDL argument', () => {
        expectTypeOf(createIdlClient(codamaIdl)).toEqualTypeOf<IdlClient<CodamaIdl>>();
        expectTypeOf(createIdlClient(anchorIdl)).toEqualTypeOf<IdlClient<AnchorIdl>>();
        expectTypeOf(createIdlClient(anchorIdl as SupportedIdl)).toEqualTypeOf<IdlClient<SupportedIdl>>();
    });

    it('should keep the idl property at the inferred standard', () => {
        expectTypeOf(createIdlClient(codamaIdl).idl).toEqualTypeOf<CodamaIdl>();
        expectTypeOf(createIdlClient(anchorIdl).idl).toEqualTypeOf<AnchorIdl>();
    });

    it('should type the metadata helpers as optional strings', () => {
        const client = createIdlClient(anchorIdl);
        expectTypeOf(client.programAddress()).toEqualTypeOf<string | undefined>();
        expectTypeOf(client.programName()).toEqualTypeOf<string | undefined>();
        expectTypeOf(client.instructionName(new Uint8Array())).toEqualTypeOf<string | undefined>();
    });
});

describe('decode result inference', () => {
    it('should narrow the Codama client instruction decode to the codama and unknown arms', () => {
        const client = createIdlClient(codamaIdl);
        expectTypeOf(client.decodeInstruction(anchorIncrementIx)).toEqualTypeOf<
            Exclude<InstructionDecode, { kind: IdlStandard.Anchor }>
        >();
    });

    it('should keep all instruction decode arms for the Anchor client (codama fallback stays possible)', () => {
        const client = createIdlClient(anchorIdl);
        expectTypeOf(client.decodeInstruction(anchorIncrementIx)).toEqualTypeOf<InstructionDecode>();
    });

    it('should narrow account decodes the same way', () => {
        expectTypeOf(createIdlClient(codamaIdl).decodeAccount(new Uint8Array())).toEqualTypeOf<
            Exclude<AccountDecode, { kind: IdlStandard.Anchor }>
        >();
        expectTypeOf(createIdlClient(anchorIdl).decodeAccount(new Uint8Array())).toEqualTypeOf<AccountDecode>();
    });

    it('should infer the handler-map return type as R', () => {
        const client = createIdlClient(codamaIdl);
        const result = client.decodeInstruction(anchorIncrementIx, {
            codama: () => 'decoded' as const,
            unknown: () => 'failed' as const,
        });
        expectTypeOf(result).toEqualTypeOf<'decoded' | 'failed'>();
    });

    it('should pass each handler its narrowed decode arm', () => {
        const client = createIdlClient(anchorIdl);
        client.decodeInstruction(anchorIncrementIx, {
            anchor: decode => expectTypeOf(decode).toEqualTypeOf<{ decoded: unknown; kind: IdlStandard.Anchor }>(),
            codama: decode =>
                expectTypeOf(decode).toEqualTypeOf<{ decoded: CodamaDecodedInstruction; kind: IdlStandard.Codama }>(),
            unknown: decode => expectTypeOf(decode).toEqualTypeOf<{ errors: IdlError[]; kind: 'unknown' }>(),
        });
    });

    it('should not require an anchor handler on a Codama client handler map', () => {
        expectTypeOf<keyof InstructionHandlers<CodamaIdl, void>>().toEqualTypeOf<IdlStandard.Codama | 'unknown'>();
        expectTypeOf<keyof InstructionHandlers<AnchorIdl, void>>().toEqualTypeOf<IdlStandard | 'unknown'>();
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
        const client = createIdlClient(anchorIdl);
        client.decodeAccount(new Uint8Array(), {
            anchor: decode => expectTypeOf(decode).toEqualTypeOf<{ decoded: unknown; kind: IdlStandard.Anchor }>(),
            codama: decode =>
                expectTypeOf(decode).toEqualTypeOf<{ decoded: CodamaDecodedAccount; kind: IdlStandard.Codama }>(),
            unknown: decode => expectTypeOf(decode).toEqualTypeOf<{ errors: IdlError[]; kind: 'unknown' }>(),
        });
    });

    it('should type getDecodedData as the generic payload accessor over every decoder result', () => {
        const codamaClient = createIdlClient(codamaIdl);
        const anchorClient = createIdlClient(anchorIdl);

        expectTypeOf(getDecodedData(codamaClient.decodeInstruction(anchorIncrementIx))).toEqualTypeOf<unknown>();
        expectTypeOf(getDecodedData(codamaClient.decodeAccount(new Uint8Array()))).toEqualTypeOf<unknown>();
        expectTypeOf(getDecodedData(anchorClient.decodeInstruction(anchorIncrementIx))).toEqualTypeOf<unknown>();
        expectTypeOf(getDecodedData(anchorClient.decodeAccount(new Uint8Array()))).toEqualTypeOf<unknown>();
        expectTypeOf(getDecodedData(decodeInstructionWithIdl(codamaIdl, anchorIncrementIx))).toEqualTypeOf<unknown>();
        expectTypeOf(getDecodedData(decodeAccountWithIdl(anchorIdl, new Uint8Array()))).toEqualTypeOf<unknown>();
    });
});

describe('tryCreateIdlClient inference', () => {
    it('should return an error-first result declaring the only failure code it can produce', () => {
        expectTypeOf(tryCreateIdlClient({} as unknown)).toEqualTypeOf<
            Result<IdlClient, typeof IDL_ERROR__UNSUPPORTED_IDL_FORMAT>
        >();
    });

    it('should narrow the tuple by checking the error slot', () => {
        const [error, client] = tryCreateIdlClient({} as unknown);
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
        const client = createIdlClient(codamaIdl as SupportedIdl);
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
            legacyAnchorDecoder: (idl, ix) => {
                expectTypeOf(idl).toEqualTypeOf<AnchorIdl>();
                expectTypeOf(ix).toEqualTypeOf<Instruction>();
                return undefined;
            },
        });
    });
});
