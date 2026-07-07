// Codama documents end to end, over codama's own dynamic-client test IDLs — the `codama-fixtures`
// sha-pinned tarball devDependency, so the documents are imported at their source revision, never copied.
import { createProgramClient, type ProgramClient } from '@codama/dynamic-client';
import { getNodeCodec } from '@codama/dynamic-codecs';
import {
    type CodamaIdl,
    IDL_ERROR__INSTRUCTION_DECODE_FAILED,
    IdlStandard,
    isCodamaStandard,
    tryCreateIdlClient,
} from '@explorer/idl';
import { createCodamaIdlClient } from '@explorer/idl/codama';
import type { Instruction } from '@solana/kit';
import { getLastNodeFromPath } from 'codama';
import associatedTokenAccountIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/associated-token-account-idl.json';
import blogIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/blog-idl.json';
import circularAccountRefsIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/circular-account-refs-idl.json';
import collectionTypesIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/collection-types-idl.json';
import customResolversTestIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/custom-resolvers-test-idl.json';
import exampleIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/example-idl.json';
import mplTokenMetadataIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/mpl-token-metadata-idl.json';
import pmpIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/pmp-idl.json';
import sasIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/sas-idl.json';
import systemProgramIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/system-program-idl.json';
import token2022Idl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/token-2022-idl.json';
import tokenIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/token-idl.json';
import { describe, expect, expectTypeOf, it } from 'vitest';

/* eslint-disable @typescript-eslint/consistent-type-assertions -- the imported JSON documents are known codama roots (detection is re-proven per test); NodePath/Instruction casts bridge codama tooling with the client */

const DEFAULT_ADDRESS = '11111111111111111111111111111111';
// dynamic-codecs represents bytesTypeNode values as [encoding, data] tuples; the parsers READ them
// back as base64 regardless of what encoding fed the encoder.
const base16 = (hex: string): [string, string] => ['base16', hex];
const base64 = (data: string): [string, string] => ['base64', data];

/** The PMP-fetch acquisition route for codama roots: plain untrusted JSON, no anchor client involved. */
function fetchedJson(document: CodamaIdl): unknown {
    return JSON.parse(JSON.stringify(document));
}

/** Build the named zero-argument instruction with codama's OWN dynamic client (every account defaulted). */
async function buildInstruction(document: CodamaIdl, name: string): Promise<Instruction> {
    const node = document.program.instructions.find(item => item.name === name);
    if (!node) throw new Error(`${name} must be declared by the document`);
    const accounts = Object.fromEntries(node.accounts.map(item => [item.name, DEFAULT_ADDRESS]));
    const built = await createProgramClient<ProgramClient>(document).methods[name]().accounts(accounts).instruction();
    return built as Instruction;
}

/** Encode the named account's full field values (incl. discriminator defaults) with codama's OWN codec. */
function encodeAccount(document: CodamaIdl, name: string, data: object): Uint8Array {
    const node = document.program.accounts.find(item => item.name === name);
    if (!node) throw new Error(`${name} must be declared by the document`);
    const codec = getNodeCodec([document, document.program, node] as Parameters<typeof getNodeCodec>[0]);
    return Uint8Array.from(codec.encode(data));
}

// Deliberately one hand-written section per program, NOT describe.each — a shared table would widen
// every case to one row type, and these cases exist to show the inference at each call site.
describe('functional: Codama documents (dynamic-client test IDLs)', () => {
    describe('associated-token-account', () => {
        const document = associatedTokenAccountIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should decode the create instruction built by the dynamic client', async () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction(await buildInstruction(document, 'create'));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;

            expect(getLastNodeFromPath(result.path).name).toBe('create');
        });
    });

    describe('blog', () => {
        const document = blogIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should decode the subscribe instruction built by the dynamic client', async () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction(await buildInstruction(document, 'subscribe'));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;

            expect(getLastNodeFromPath(result.path).name).toBe('subscribe');
        });

        it('should decode the accessGrant account from codec-encoded bytes', () => {
            // the IDL signature of accessGrant, as codama's runtime represents it (bytes = [encoding, data])
            type AccessGrantData = {
                bump: number;
                discriminator: [string, string];
                permissions: [string, string];
                profile: string;
            };
            const client = createCodamaIdlClient(document);
            const bytes = encodeAccount(document, 'accessGrant', {
                bump: 255,
                discriminator: base16('a737b8ed4af2006d'),
                permissions: base16('00000000'),
                profile: DEFAULT_ADDRESS,
            });

            const decode = client.decodeAccount(bytes);

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            const data = client.getDecodedData<AccessGrantData>(decode);

            expectTypeOf(data).toEqualTypeOf<AccessGrantData>();
            expect(getLastNodeFromPath(result.path).name).toBe('accessGrant');
            expect(data).toEqual({
                bump: 255,
                discriminator: base64('pze47UryAG0='),
                permissions: base64('AAAAAA=='),
                profile: DEFAULT_ADDRESS,
            });
        });
    });

    describe('circular-account-refs', () => {
        const document = circularAccountRefsIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        /** Case: identification is discriminator-driven — this document declares none, so decoding can only miss safely. */
        it('should stay on the unknown arm when instructions declare no discriminators', () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction({
                accounts: [],
                data: Uint8Array.from([1, 2, 3]),
                programAddress: document.program.publicKey as Instruction['programAddress'],
            });

            if (decode.kind !== 'unknown') throw new Error('expected the unknown arm');
            // codama's parser throws on some discriminator-less documents — surfaced per the errors contract
            expect(decode.errors.every(error => error.code === IDL_ERROR__INSTRUCTION_DECODE_FAILED)).toBe(true);
        });
    });

    describe('collection-types', () => {
        const document = collectionTypesIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should stay on the unknown arm when instructions declare no discriminators', () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction({
                accounts: [],
                data: Uint8Array.from([1, 2, 3]),
                programAddress: document.program.publicKey as Instruction['programAddress'],
            });

            if (decode.kind !== 'unknown') throw new Error('expected the unknown arm');
            expect(decode.errors.every(error => error.code === IDL_ERROR__INSTRUCTION_DECODE_FAILED)).toBe(true);
        });
    });

    describe('custom-resolvers-test', () => {
        const document = customResolversTestIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should stay on the unknown arm when instructions declare no discriminators', () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction({
                accounts: [],
                data: Uint8Array.from([1, 2, 3]),
                programAddress: document.program.publicKey as Instruction['programAddress'],
            });

            if (decode.kind !== 'unknown') throw new Error('expected the unknown arm');
            expect(decode.errors.every(error => error.code === IDL_ERROR__INSTRUCTION_DECODE_FAILED)).toBe(true);
        });
    });

    describe('example', () => {
        const document = exampleIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should decode the noArguments instruction built by the dynamic client', async () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction(await buildInstruction(document, 'noArguments'));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;

            expect(getLastNodeFromPath(result.path).name).toBe('noArguments');
        });

        it('should decode the dataAccount1 account from codec-encoded bytes', () => {
            // the IDL signature of dataAccount1: u64 → bigint, option → kit Option object
            type DataAccount1Data = {
                bump: number;
                discriminator: [string, string];
                input: bigint;
                optionalInput: { __option: 'None' } | { __option: 'Some'; value: string };
            };
            const client = createCodamaIdlClient(document);
            const bytes = encodeAccount(document, 'dataAccount1', {
                bump: 255,
                discriminator: base16('bd16d2a9c3062624'),
                input: 0n,
                optionalInput: null,
            });

            const decode = client.decodeAccount(bytes);

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            const data = client.getDecodedData<DataAccount1Data>(decode);

            expectTypeOf(data).toEqualTypeOf<DataAccount1Data>();
            expect(getLastNodeFromPath(result.path).name).toBe('dataAccount1');
            expect(data).toEqual({
                bump: 255,
                discriminator: base64('vRbSqcMGJiQ='),
                input: 0n,
                optionalInput: { __option: 'None' },
            });
        });
    });

    describe('mpl-token-metadata', () => {
        const document = mplTokenMetadataIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should decode the puffMetadata instruction built by the dynamic client', async () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction(await buildInstruction(document, 'puffMetadata'));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;

            expect(getLastNodeFromPath(result.path).name).toBe('puffMetadata');
        });

        it('should decode the editionMarker account from codec-encoded bytes', () => {
            // the IDL signature of editionMarker: scalar enums ENCODE by variant name but DECODE to the index
            type EditionMarkerData = { key: number; ledger: [string, string] };
            const client = createCodamaIdlClient(document);
            // key is a scalar enum discriminator — encoded by variant name
            const bytes = encodeAccount(document, 'editionMarker', {
                key: 'editionMarker',
                ledger: base16('00'.repeat(31)),
            });

            const decode = client.decodeAccount(bytes);

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            const data = client.getDecodedData<EditionMarkerData>(decode);

            expectTypeOf(data).toEqualTypeOf<EditionMarkerData>();
            expect(getLastNodeFromPath(result.path).name).toBe('editionMarker');
            // 7 = the editionMarker variant's position in the Key enum
            expect(data).toEqual({ key: 7, ledger: base64('AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==') });
        });
    });

    describe('pmp', () => {
        const document = pmpIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should decode the setImmutable instruction built by the dynamic client', async () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction(await buildInstruction(document, 'setImmutable'));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;

            expect(getLastNodeFromPath(result.path).name).toBe('setImmutable');
        });
    });

    describe('sas', () => {
        const document = sasIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should decode the emitEvent instruction built by the dynamic client', async () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction(await buildInstruction(document, 'emitEvent'));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;

            expect(getLastNodeFromPath(result.path).name).toBe('emitEvent');
        });
    });

    describe('system-program', () => {
        const document = systemProgramIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should decode the upgradeNonceAccount instruction built by the dynamic client', async () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction(await buildInstruction(document, 'upgradeNonceAccount'));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;

            expect(getLastNodeFromPath(result.path).name).toBe('upgradeNonceAccount');
        });
    });

    describe('token', () => {
        const document = tokenIdl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should decode the syncNative instruction built by the dynamic client', async () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction(await buildInstruction(document, 'syncNative'));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;

            expect(getLastNodeFromPath(result.path).name).toBe('syncNative');
        });

        /** Case: no codama tooling on the encode side — the raw document alone is enough to decode hand-built bytes. */
        it('should decode the syncNative instruction from raw hand-built bytes', () => {
            // the IDL signature of syncNative: a single u8 discriminator (17), no other data
            type SyncNativeData = { discriminator: number };
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction({
                accounts: [],
                data: Uint8Array.from([17]),
                programAddress: document.program.publicKey as Instruction['programAddress'],
            });

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            const data = client.getDecodedData<SyncNativeData>(decode);

            expectTypeOf(data).toEqualTypeOf<SyncNativeData>();
            expect(getLastNodeFromPath(result.path).name).toBe('syncNative');
            expect(data).toEqual({ discriminator: 17 });
        });

        it('should decode the multisig account from codec-encoded bytes', () => {
            // the IDL signature of multisig: pubkeys decode as base58 strings
            type MultisigData = { isInitialized: boolean; m: number; n: number; signers: string[] };
            const client = createCodamaIdlClient(document);
            // multisig carries no discriminator field — it is identified by its exact size
            const bytes = encodeAccount(document, 'multisig', {
                isInitialized: true,
                m: 1,
                n: 1,
                signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
            });

            const decode = client.decodeAccount(bytes);

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            const data = client.getDecodedData<MultisigData>(decode);

            expectTypeOf(data).toEqualTypeOf<MultisigData>();
            expect(getLastNodeFromPath(result.path).name).toBe('multisig');
            expect(data).toEqual({
                isInitialized: true,
                m: 1,
                n: 1,
                signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
            });
        });

        it('should decode the multisig account from raw hand-built bytes', () => {
            type MultisigData = { isInitialized: boolean; m: number; n: number; signers: string[] };
            const client = createCodamaIdlClient(document);

            // m=1, n=1, initialized, 11 zeroed signer pubkeys — the exact 355 bytes that identify multisig
            const decode = client.decodeAccount(Uint8Array.from([1, 1, 1, ...new Uint8Array(11 * 32)]));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            const data = client.getDecodedData<MultisigData>(decode);

            expectTypeOf(data).toEqualTypeOf<MultisigData>();
            expect(getLastNodeFromPath(result.path).name).toBe('multisig');
            expect(data).toEqual({
                isInitialized: true,
                m: 1,
                n: 1,
                signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
            });
        });
    });

    describe('token-2022', () => {
        const document = token2022Idl as unknown as CodamaIdl;

        it('should wrap the untrusted document into a codama client', () => {
            const [error, client] = tryCreateIdlClient(fetchedJson(document));
            expect(error).toBeUndefined();
            if (!client) throw new Error('unreachable');

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it('should decode the syncNative instruction built by the dynamic client', async () => {
            const client = createCodamaIdlClient(document);

            const decode = client.decodeInstruction(await buildInstruction(document, 'syncNative'));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;

            expect(getLastNodeFromPath(result.path).name).toBe('syncNative');
        });

        it('should decode the multisig account from codec-encoded bytes', () => {
            type MultisigData = { isInitialized: boolean; m: number; n: number; signers: string[] };
            const client = createCodamaIdlClient(document);
            const bytes = encodeAccount(document, 'multisig', {
                isInitialized: true,
                m: 1,
                n: 1,
                signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
            });

            const decode = client.decodeAccount(bytes);

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            const data = client.getDecodedData<MultisigData>(decode);

            expectTypeOf(data).toEqualTypeOf<MultisigData>();
            expect(getLastNodeFromPath(result.path).name).toBe('multisig');
            expect(data).toEqual({
                isInitialized: true,
                m: 1,
                n: 1,
                signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
            });
        });
    });
});
