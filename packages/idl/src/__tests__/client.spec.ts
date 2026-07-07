import { describe, expect, it } from 'vitest';

import { createIdlClient, type IdlMetaClient, isAnchorStandard, isCodamaStandard, tryCreateIdlClient } from '../client';
import { createCodamaIdlClient, tryCreateCodamaIdlClient } from '../codama/index';
import { IDL_ERROR__IDL_ADDRESS_MISMATCH, IDL_ERROR__UNSUPPORTED_IDL_FORMAT, IdlError } from '../errors';
import { IdlStandard, type SupportedIdl } from '../types';
import { incrementIx, loadSimpleIdl, loadTokenkegIdl, transferIx } from './fixtures';

describe('createIdlClient (engine-free metadata client)', () => {
    it('should expose program metadata for an Anchor IDL without any provider', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple);
        expect(client.programAddress()).toBe(simple.address);
        expect(client.programName()).toBe('Simple');
        expect(client.instructionName(incrementIx(simple).data)).toBe('Increment');
    });

    it('should expose program metadata for a Codama IDL without any provider', () => {
        const tokenkeg = loadTokenkegIdl();
        const client = createIdlClient(tokenkeg);
        expect(client.programAddress()).toBe(tokenkeg.program.publicKey);
        expect(client.programName()).toBe('Token');
        expect(client.instructionName(transferIx(tokenkeg).data)).toBe('Transfer');
    });

    it('should not carry decode methods without a provider', () => {
        const client = createIdlClient(loadSimpleIdl());
        expect('decodeInstruction' in client).toBe(false);
        expect('decodeAccount' in client).toBe(false);
    });

    it('should throw the unsupported-format error when a lying type sneaks past detection', () => {
        expect(() => createIdlClient({} as SupportedIdl)).toThrowError(
            expect.objectContaining({ code: IDL_ERROR__UNSUPPORTED_IDL_FORMAT }),
        );
    });
});

describe('createCodamaIdlClient (provider pre-wired)', () => {
    it('should decode a Codama instruction into the codama arm', () => {
        const tokenkeg = loadTokenkegIdl();
        const decode = createCodamaIdlClient(tokenkeg).decodeInstruction(transferIx(tokenkeg));
        expect(decode.kind).toBe(IdlStandard.Codama);
    });

    it('should decode an Anchor instruction through the conversion route into the codama arm', () => {
        const simple = loadSimpleIdl();
        const decode = createCodamaIdlClient(simple).decodeInstruction(incrementIx(simple));
        expect(decode.kind).toBe(IdlStandard.Codama);
    });

    it('should dispatch a decode through the handler map', () => {
        const tokenkeg = loadTokenkegIdl();
        const result = createCodamaIdlClient(tokenkeg).decodeInstruction(transferIx(tokenkeg), {
            codama: () => 'decoded' as const,
            unknown: () => 'failed' as const,
        });
        expect(result).toBe('decoded');
    });

    it('should degrade unmatched instruction data to the unknown arm', () => {
        const tokenkeg = loadTokenkegIdl();
        const decode = createCodamaIdlClient(tokenkeg).decodeInstruction({
            ...transferIx(tokenkeg),
            data: Uint8Array.from([99, 1, 2]),
        });
        expect(decode.kind).toBe('unknown');
    });

    it('should fail loud when the IDL program does not match the instruction program', () => {
        const simple = loadSimpleIdl();
        const client = createCodamaIdlClient(simple);
        expect(() =>
            client.decodeInstruction({
                ...incrementIx(simple),
                programAddress: transferIx(loadTokenkegIdl()).programAddress,
            }),
        ).toThrowError(expect.objectContaining({ code: IDL_ERROR__IDL_ADDRESS_MISMATCH }));
    });

    it('should degrade unmatched account data to the unknown arm', () => {
        const decode = createCodamaIdlClient(loadSimpleIdl()).decodeAccount(Uint8Array.from([1, 2, 3]));
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

    it('should return the metadata client in the value slot for supported input', () => {
        const [error, client] = tryCreateIdlClient(loadTokenkegIdl() as unknown);
        expect(error).toBeUndefined();
        expect(client?.programName()).toBe('Token');
    });

    it('should return the full client through the codama convenience wrapper', () => {
        const tokenkeg = loadTokenkegIdl();
        const [error, client] = tryCreateCodamaIdlClient(tokenkeg as unknown);
        expect(error).toBeUndefined();
        expect(client?.decodeInstruction(transferIx(tokenkeg)).kind).toBe(IdlStandard.Codama);
    });
});

describe('standard guards', () => {
    it('should narrow an Anchor client', () => {
        const client: IdlMetaClient = createIdlClient(loadSimpleIdl() as SupportedIdl);
        expect(isAnchorStandard(client)).toBe(true);
        expect(isCodamaStandard(client)).toBe(false);
    });

    it('should narrow a Codama client', () => {
        const client: IdlMetaClient = createIdlClient(loadTokenkegIdl() as SupportedIdl);
        expect(isCodamaStandard(client)).toBe(true);
        expect(isAnchorStandard(client)).toBe(false);
    });
});
