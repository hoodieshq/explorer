import { address } from '@solana/kit';
import { describe, expect, it, vi } from 'vitest';

import { createIdlClient, type IdlMetaClient, isAnchorStandard, isCodamaStandard, tryCreateIdlClient } from '../client';
import { createCodamaIdlClient, tryCreateCodamaIdlClient } from '../codama/index';
import {
    IDL_ERROR__ACCOUNT_DECODE_FAILED,
    IDL_ERROR__DECODE_KIND_MISMATCH,
    IDL_ERROR__IDL_ADDRESS_MISMATCH,
    IDL_ERROR__IDL_PARSE_FAILED,
    IDL_ERROR__INSTRUCTION_DECODE_FAILED,
    IDL_ERROR__MISSING_DECODE_HANDLER,
    IDL_ERROR__UNSUPPORTED_IDL_FORMAT,
    IdlError,
} from '../errors';
import { type AnchorIdl, type CodamaIdl, IdlStandard, type InstructionHandlers, type SupportedIdl } from '../types';
import { incrementIx, loadSimpleIdl, loadTokenkegIdl, transferIx, undeclaredInstructionData } from './fixtures';

// passes isAnchorIdl (address + metadata.spec + instructions) but rootNodeFromAnchor rejects the arg type
const brokenAnchorIdl = () =>
    ({
        address: '11111111111111111111111111111111',
        instructions: [{ accounts: [], args: [{ name: 'x', type: 'not-a-type' }], discriminator: [9], name: 'boom' }],
        metadata: { name: 'broken', spec: '0.1.0', version: '0.0.1' },
    }) as unknown as AnchorIdl;

const brokenIx = () => ({
    accounts: [],
    data: Uint8Array.from([9, 1]),
    programAddress: address('11111111111111111111111111111111'),
});

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
        expect('decodeInstructionData' in client).toBe(false);
        expect('decodeAccountData' in client).toBe(false);
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

    it('should dispatch an account decode through the handler map', () => {
        const result = createCodamaIdlClient(loadSimpleIdl()).decodeAccount(Uint8Array.from([1, 2, 3]), {
            anchor: () => 'rescued' as const,
            codama: () => 'decoded' as const,
            unknown: () => 'miss' as const,
        });
        expect(result).toBe('miss');
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

describe('handler-map dispatch guard', () => {
    it('should dispatch an anchor decode through the handler map', () => {
        const simple = loadSimpleIdl();
        const missIx = { ...incrementIx(simple), data: undeclaredInstructionData() };
        const result = createCodamaIdlClient(simple, {
            legacyAnchorDecoder: () => ({ name: 'increment' }),
        }).decodeInstruction(missIx, {
            anchor: () => 'rescued' as const,
            codama: () => 'decoded' as const,
            unknown: () => 'failed' as const,
        });
        expect(result).toBe('rescued');
    });

    it('should throw MISSING_DECODE_HANDLER when a widened handler map misses the arm', () => {
        const tokenkeg = loadTokenkegIdl();
        // the types enforce totality — widen the map to pin the runtime guard behind them
        const handlers = { unknown: () => 'failed' } as unknown as InstructionHandlers<CodamaIdl, string>;
        expect(() => createCodamaIdlClient(tokenkeg).decodeInstruction(transferIx(tokenkeg), handlers)).toThrowError(
            expect.objectContaining({ code: IDL_ERROR__MISSING_DECODE_HANDLER }),
        );
    });
});

describe('legacyAnchorDecoder escape hatch', () => {
    it('should pass the anchor document and the instruction to the injected decoder', () => {
        const simple = loadSimpleIdl();
        const legacyAnchorDecoder = vi.fn(() => undefined);
        const missIx = { ...incrementIx(simple), data: undeclaredInstructionData() };
        createCodamaIdlClient(simple, { legacyAnchorDecoder }).decodeInstruction(missIx);
        expect(legacyAnchorDecoder).toHaveBeenCalledExactlyOnceWith(simple, missIx);
    });

    it('should never call the injected decoder for a Codama document', () => {
        const tokenkeg = loadTokenkegIdl();
        const legacyAnchorDecoder = vi.fn(() => undefined);
        createCodamaIdlClient(tokenkeg, { legacyAnchorDecoder }).decodeInstruction({
            ...transferIx(tokenkeg),
            data: Uint8Array.from([99, 1, 2]),
        });
        expect(legacyAnchorDecoder).not.toHaveBeenCalled();
    });

    it('should land on the anchor arm when the decoder rescues a converted-but-unmatched instruction', () => {
        const simple = loadSimpleIdl();
        const missIx = { ...incrementIx(simple), data: undeclaredInstructionData() };
        const decode = createCodamaIdlClient(simple, {
            legacyAnchorDecoder: () => ({ name: 'increment' }),
        }).decodeInstruction(missIx);
        if (decode.kind !== IdlStandard.Anchor) throw new Error('expected the anchor arm');
        expect(decode.decoded).toEqual({ name: 'increment' });
        // conversion succeeded, so no bypassed pipeline errors ride along
        expect(decode.recoveredFrom).toBeUndefined();
    });

    it('should return the decoded payload from the anchor arm', () => {
        const simple = loadSimpleIdl();
        const missIx = { ...incrementIx(simple), data: undeclaredInstructionData() };
        const client = createCodamaIdlClient(simple, {
            legacyAnchorDecoder: () => ({ name: 'increment' }),
        });
        const decode = client.decodeInstruction(missIx);
        if (decode.kind !== IdlStandard.Anchor) throw new Error('expected the anchor arm');
        expect(client.getDecodedData(decode)).toEqual({ name: 'increment' });
    });

    it('should fall to the unknown arm when the decoder returns undefined', () => {
        const simple = loadSimpleIdl();
        const missIx = { ...incrementIx(simple), data: undeclaredInstructionData() };
        const decode = createCodamaIdlClient(simple, { legacyAnchorDecoder: () => undefined }).decodeInstruction(
            missIx,
        );
        expect(decode.kind).toBe('unknown');
    });

    it('should fold a throwing decoder into the unknown arm instead of escaping', () => {
        const simple = loadSimpleIdl();
        const missIx = { ...incrementIx(simple), data: undeclaredInstructionData() };
        const decode = createCodamaIdlClient(simple, {
            legacyAnchorDecoder: () => {
                throw new Error('decoder boom');
            },
        }).decodeInstruction(missIx);
        if (decode.kind !== 'unknown') throw new Error('expected the unknown arm');
        expect(decode.errors.map(e => e.code)).toEqual([IDL_ERROR__INSTRUCTION_DECODE_FAILED]);
    });

    it('should return undefined for the unknown arm payload', () => {
        const simple = loadSimpleIdl();
        const missIx = { ...incrementIx(simple), data: undeclaredInstructionData() };
        const client = createCodamaIdlClient(simple, { legacyAnchorDecoder: () => undefined });
        expect(client.getDecodedData(client.decodeInstruction(missIx))).toBeUndefined();
    });
});

describe('unknown-arm errors contract', () => {
    it('should report a plain miss with an empty errors array', () => {
        const tokenkeg = loadTokenkegIdl();
        const decode = createCodamaIdlClient(tokenkeg).decodeInstruction({
            ...transferIx(tokenkeg),
            data: Uint8Array.from([99, 1, 2]),
        });
        if (decode.kind !== 'unknown') throw new Error('expected the unknown arm');
        expect(decode.errors).toEqual([]);
    });

    it('should carry the conversion error for a detected-but-unconvertible document', () => {
        const decode = createCodamaIdlClient(brokenAnchorIdl()).decodeInstruction(brokenIx());
        if (decode.kind !== 'unknown') throw new Error('expected the unknown arm');
        expect(decode.errors.map(e => e.code)).toEqual([IDL_ERROR__IDL_PARSE_FAILED]);
    });

    it('should keep the bypassed pipeline errors on a legacy-decoder rescue', () => {
        const decode = createCodamaIdlClient(brokenAnchorIdl(), {
            legacyAnchorDecoder: () => ({ name: 'boom' }),
        }).decodeInstruction(brokenIx());
        if (decode.kind !== IdlStandard.Anchor) throw new Error('expected the anchor arm');
        expect(decode.recoveredFrom?.map(e => e.code)).toEqual([IDL_ERROR__IDL_PARSE_FAILED]);
    });

    it('should label a decode throw as an instruction-decode failure, not a document-parse failure', () => {
        const tokenkeg = loadTokenkegIdl();
        // the discriminator matches transfer (u8 3) but the u64 amount bytes are missing — the parser throws
        const decode = createCodamaIdlClient(tokenkeg).decodeInstruction({
            ...transferIx(tokenkeg),
            data: Uint8Array.from([3]),
        });
        if (decode.kind !== 'unknown') throw new Error('expected the unknown arm');
        expect(decode.errors.map(e => e.code)).toEqual([IDL_ERROR__INSTRUCTION_DECODE_FAILED]);
    });
});

// m=1, n=1, initialized, 11 zeroed signer pubkeys — identifies the tokenkeg multisig account by size
const multisigBytes = () => Uint8Array.from([1, 1, 1, ...new Uint8Array(11 * 32)]);

describe('decodeInstructionData / decodeAccountData (combined error-first decode)', () => {
    it('should return the instruction payload in the value slot', () => {
        const tokenkeg = loadTokenkegIdl();
        const [error, data] = createCodamaIdlClient(tokenkeg).decodeInstructionData<{ amount: bigint }>(
            transferIx(tokenkeg),
        );
        expect(error).toBeUndefined();
        expect(data).toMatchObject({ amount: 42n });
    });

    it('should return the account payload in the value slot', () => {
        const [error, data] = createCodamaIdlClient(loadTokenkegIdl()).decodeAccountData<{ m: number; n: number }>(
            multisigBytes(),
        );
        expect(error).toBeUndefined();
        expect(data).toMatchObject({ m: 1, n: 1 });
    });

    it('should pass the kind assertion when the decode arm matches', () => {
        const tokenkeg = loadTokenkegIdl();
        const [error, data] = createCodamaIdlClient(tokenkeg).decodeInstructionData<{ amount: bigint }>(
            transferIx(tokenkeg),
            IdlStandard.Codama,
        );
        expect(error).toBeUndefined();
        expect(data).toMatchObject({ amount: 42n });
    });

    it('should return the kind-mismatch error when the asserted kind differs', () => {
        const tokenkeg = loadTokenkegIdl();
        const [error, data] = createCodamaIdlClient(tokenkeg).decodeInstructionData(
            transferIx(tokenkeg),
            IdlStandard.Anchor,
        );
        expect(data).toBeUndefined();
        expect(error?.code).toBe(IDL_ERROR__DECODE_KIND_MISMATCH);
        expect(error?.context).toEqual({ expected: IdlStandard.Anchor, received: IdlStandard.Codama });
    });

    it('should return the account kind-mismatch error when the asserted kind differs', () => {
        const tokenkeg = loadTokenkegIdl() as CodamaIdl;
        const [error, data] = createCodamaIdlClient(tokenkeg).decodeAccountData<unknown>(
            multisigBytes(),
            IdlStandard.Anchor,
        );
        expect(data).toBeUndefined();
        expect(error?.code).toBe(IDL_ERROR__DECODE_KIND_MISMATCH);
        expect(error?.context).toEqual({ expected: IdlStandard.Anchor, received: IdlStandard.Codama });
    });

    it('should return a fresh decode-failed error for a plain instruction miss', () => {
        const tokenkeg = loadTokenkegIdl();
        const [error, data] = createCodamaIdlClient(tokenkeg).decodeInstructionData({
            ...transferIx(tokenkeg),
            data: Uint8Array.from([99, 1, 2]),
        });
        expect(data).toBeUndefined();
        expect(error?.code).toBe(IDL_ERROR__INSTRUCTION_DECODE_FAILED);
    });

    it('should return a fresh decode-failed error for a plain account miss', () => {
        const [error, data] = createCodamaIdlClient(loadSimpleIdl()).decodeAccountData(Uint8Array.from([1, 2, 3]));
        expect(data).toBeUndefined();
        expect(error?.code).toBe(IDL_ERROR__ACCOUNT_DECODE_FAILED);
        expect(error?.context).toMatchObject({ dataLength: 3 });
    });

    it('should surface the pipeline error for a detected-but-unconvertible document', () => {
        const [error, data] = createCodamaIdlClient(brokenAnchorIdl()).decodeInstructionData(brokenIx());
        expect(data).toBeUndefined();
        expect(error?.code).toBe(IDL_ERROR__IDL_PARSE_FAILED);
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
