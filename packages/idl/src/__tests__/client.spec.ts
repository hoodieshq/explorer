import { describe, expect, it } from 'vitest';

import { createIdlClient, type IdlClient, isAnchorStandard, isCodamaStandard, tryCreateIdlClient } from '../client';
import { IDL_ERROR__IDL_ADDRESS_MISMATCH, IDL_ERROR__UNSUPPORTED_IDL_FORMAT, IdlError } from '../errors';
import { IdlStandard, type SupportedIdl } from '../types';
import {
    ANCHOR_PROGRAM_ADDRESS,
    anchorIdl,
    anchorIncrementIx,
    CODAMA_PROGRAM_ADDRESS,
    codamaIdl,
    codamaTransferIx,
} from './fixtures';

describe('createIdlClient', () => {
    it('should expose program metadata for an Anchor IDL', () => {
        const client = createIdlClient(anchorIdl);
        expect(client.programAddress()).toBe(ANCHOR_PROGRAM_ADDRESS);
        expect(client.programName()).toBe('Counter');
        expect(client.instructionName(anchorIncrementIx.data)).toBe('Increment');
    });

    it('should expose program metadata for a Codama IDL', () => {
        const client = createIdlClient(codamaIdl);
        expect(client.programAddress()).toBe(CODAMA_PROGRAM_ADDRESS);
        expect(client.programName()).toBe('Token Vault');
        expect(client.instructionName(Uint8Array.from([3, 0, 0]))).toBe('Transfer');
    });

    it('should throw the unsupported-format error when a lying type sneaks past detection', () => {
        expect(() => createIdlClient({} as SupportedIdl)).toThrowError(
            expect.objectContaining({ code: IDL_ERROR__UNSUPPORTED_IDL_FORMAT }),
        );
    });

    it('should decode a Codama instruction into the codama arm', () => {
        const decode = createIdlClient(codamaIdl).decodeInstruction(codamaTransferIx);
        expect(decode.kind).toBe(IdlStandard.Codama);
    });

    it('should decode an Anchor instruction through the conversion route into the codama arm', () => {
        const decode = createIdlClient(anchorIdl).decodeInstruction(anchorIncrementIx);
        expect(decode.kind).toBe(IdlStandard.Codama);
    });

    it('should dispatch a decode through the handler map', () => {
        const result = createIdlClient(codamaIdl).decodeInstruction(codamaTransferIx, {
            codama: () => 'decoded' as const,
            unknown: () => 'failed' as const,
        });
        expect(result).toBe('decoded');
    });

    it('should degrade unmatched instruction data to the unknown arm', () => {
        const decode = createIdlClient(codamaIdl).decodeInstruction({
            ...codamaTransferIx,
            data: Uint8Array.from([99, 1, 2]),
        });
        expect(decode.kind).toBe('unknown');
    });

    it('should fail loud when the IDL program does not match the instruction program', () => {
        const client = createIdlClient(anchorIdl);
        expect(() =>
            client.decodeInstruction({ ...anchorIncrementIx, programAddress: codamaTransferIx.programAddress }),
        ).toThrowError(expect.objectContaining({ code: IDL_ERROR__IDL_ADDRESS_MISMATCH }));
    });

    it('should degrade unmatched account data to the unknown arm', () => {
        const decode = createIdlClient(anchorIdl).decodeAccount(Uint8Array.from([1, 2, 3]));
        expect(decode.kind).toBe('unknown');
    });
});

describe('tryCreateIdlClient', () => {
    it('should return an error-first tuple for unsupported input', () => {
        const [error, client] = tryCreateIdlClient({ not: 'an idl' });
        expect(client).toBeUndefined();
        expect(error).toBeInstanceOf(IdlError);
        expect(error?.code).toBe(IDL_ERROR__UNSUPPORTED_IDL_FORMAT);
    });

    it('should return the client in the value slot for supported input', () => {
        const [error, client] = tryCreateIdlClient(codamaIdl as unknown);
        expect(error).toBeUndefined();
        expect(client?.programName()).toBe('Token Vault');
    });
});

describe('standard guards', () => {
    it('should narrow an Anchor client', () => {
        const client: IdlClient = createIdlClient(anchorIdl as SupportedIdl);
        expect(isAnchorStandard(client)).toBe(true);
        expect(isCodamaStandard(client)).toBe(false);
    });

    it('should narrow a Codama client', () => {
        const client: IdlClient = createIdlClient(codamaIdl as SupportedIdl);
        expect(isCodamaStandard(client)).toBe(true);
        expect(isAnchorStandard(client)).toBe(false);
    });
});
