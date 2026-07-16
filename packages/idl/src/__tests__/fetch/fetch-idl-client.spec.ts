// The fetch route end to end against a mocked rpc: real account bytes on both legs — the anchor IDL
// account assembled per anchor's layout, the PMP metadata account encoded with the package's OWN
// encoder — so only the transport is faked.
import { deflateSync } from 'node:zlib';

import {
    Compression,
    DataSource,
    Encoding,
    findMetadataPda,
    Format,
    getMetadataEncoder,
} from '@solana-program/program-metadata';
import {
    address,
    type Address,
    createAddressWithSeed,
    type GetAccountInfoApi,
    getProgramDerivedAddress,
    type Rpc,
} from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { codamaProvider } from '../../codama/index';
import {
    IDL_ERROR__IDL_ADDRESS_MISMATCH,
    IDL_ERROR__IDL_FETCH_FAILED,
    IDL_ERROR__IDL_NOT_FOUND,
    IDL_ERROR__IDL_PARSE_FAILED,
    IDL_ERROR__UNSUPPORTED_IDL_FORMAT,
    isIdlError,
} from '../../errors';
import { createLatestIdlFetcher, fetchIdlClient } from '../../fetch/index';
import { incrementIx, loadSimpleIdl, loadTokenkegIdl, transferIx } from '../fixtures';
import { unwrap } from '../unwrap';

const provider = codamaProvider();

/* eslint-disable @typescript-eslint/consistent-type-assertions -- the mocked rpc covers exactly the GetAccountInfoApi surface the fetch legs call */
function mockRpc(accounts: Record<string, Uint8Array>): Rpc<GetAccountInfoApi> {
    return {
        getAccountInfo: (accountAddress: string) => ({
            send: async () => ({
                context: { slot: 0n },
                value: accounts[accountAddress]
                    ? {
                          data: [Buffer.from(accounts[accountAddress]).toString('base64'), 'base64'],
                          executable: false,
                          lamports: 1n,
                          owner: '11111111111111111111111111111111',
                          rentEpoch: 0n,
                          space: BigInt(accounts[accountAddress].length),
                      }
                    : null,
            }),
        }),
    } as unknown as Rpc<GetAccountInfoApi>;
}
/* eslint-enable @typescript-eslint/consistent-type-assertions */

/** The on-chain anchor IDL account: 8-byte discriminator + authority + u32 length + deflated JSON. */
function anchorIdlAccount(idl: object): Uint8Array {
    const deflated = deflateSync(Buffer.from(JSON.stringify(idl)));
    const data = Buffer.alloc(44 + deflated.length);
    data.writeUInt32LE(deflated.length, 40);
    deflated.copy(data, 44);
    return Uint8Array.from(data);
}

/** A canonical PMP `idl` metadata account with direct, uncompressed content (a string stays raw). */
function pmpIdlAccount(program: Address, idl: object | string, format: Format = Format.Json): Uint8Array {
    const data = new TextEncoder().encode(typeof idl === 'string' ? idl : JSON.stringify(idl));
    return Uint8Array.from(
        getMetadataEncoder().encode({
            authority: null,
            canonical: true,
            compression: Compression.None,
            data,
            dataLength: data.length,
            dataSource: DataSource.Direct,
            encoding: Encoding.Utf8,
            format,
            mutable: true,
            program,
            seed: 'idl',
        }),
    );
}

/** An anchor IDL account whose header is valid but whose deflated payload is not JSON. */
function anchorCorruptIdlAccount(): Uint8Array {
    const deflated = deflateSync(Buffer.from('not json'));
    const data = Buffer.alloc(44 + deflated.length);
    data.writeUInt32LE(deflated.length, 40);
    deflated.copy(data, 44);
    return Uint8Array.from(data);
}

async function anchorIdlAddress(program: Address): Promise<Address> {
    const [baseAddress] = await getProgramDerivedAddress({ programAddress: program, seeds: [] });
    return createAddressWithSeed({ baseAddress, programAddress: program, seed: 'anchor:idl' });
}

async function pmpIdlAddress(program: Address): Promise<Address> {
    const [metadataAddress] = await findMetadataPda({ authority: null, program, seed: 'idl' });
    return metadataAddress;
}

describe('fetchIdlClient', () => {
    it('should build a working client from a custom fetcher', async () => {
        const tokenkeg = loadTokenkegIdl();
        const client = unwrap(
            await fetchIdlClient(tokenkeg.program.publicKey, {
                fetcher: async () => JSON.parse(JSON.stringify(tokenkeg)) as unknown,
                provider,
            }),
        );

        const [, data] = client.decodeInstructionData<{ amount: bigint }>(transferIx(tokenkeg));
        expect(data).toMatchObject({ amount: 42n });
    });

    it('should reject an IDL declaring a different program address', async () => {
        const tokenkeg = loadTokenkegIdl(); // declares TokenkegQfe… — not the requested program
        const [error, client] = await fetchIdlClient('11111111111111111111111111111111', {
            fetcher: async () => JSON.parse(JSON.stringify(tokenkeg)) as unknown,
            provider,
        });

        expect(client).toBeUndefined();
        expect(isIdlError(error, IDL_ERROR__IDL_ADDRESS_MISMATCH)).toBe(true);
        expect(error?.context).toEqual({
            declaredAddress: tokenkeg.program.publicKey,
            programAddress: '11111111111111111111111111111111',
        });
    });

    it('should accept a mislabeled IDL when the address check is disabled', async () => {
        const tokenkeg = loadTokenkegIdl();
        const client = unwrap(
            await fetchIdlClient('11111111111111111111111111111111', {
                fetcher: async () => JSON.parse(JSON.stringify(tokenkeg)) as unknown,
                provider,
                verifyAddress: false,
            }),
        );

        expect(client.programAddress()).toBe(tokenkeg.program.publicKey);
    });

    it('should surface a fetched value that is no IDL as the typed unsupported-format error', async () => {
        const [error, client] = await fetchIdlClient('11111111111111111111111111111111', {
            fetcher: async () => ({ not: 'an idl' }),
            provider,
        });

        expect(client).toBeUndefined();
        expect(isIdlError(error, IDL_ERROR__UNSUPPORTED_IDL_FORMAT)).toBe(true);
    });

    it('should surface an absent IDL as the typed not-found error', async () => {
        const [error, client] = await fetchIdlClient('11111111111111111111111111111111', {
            fetcher: async () => undefined,
            provider,
        });

        expect(client).toBeUndefined();
        expect(isIdlError(error, IDL_ERROR__IDL_NOT_FOUND)).toBe(true);
        expect(error?.context).toEqual({ programAddress: '11111111111111111111111111111111' });
    });

    it('should surface a transport failure as the typed fetch error with its cause', async () => {
        const cause = new Error('rpc exploded');
        const [error] = await fetchIdlClient('11111111111111111111111111111111', {
            fetcher: async () => {
                throw cause;
            },
            provider,
        });

        expect(isIdlError(error, IDL_ERROR__IDL_FETCH_FAILED)).toBe(true);
        expect(error?.cause).toBe(cause);
    });

    it('should reject with the abort reason instead of returning an error value', async () => {
        await expect(
            fetchIdlClient('11111111111111111111111111111111', {
                abortSignal: AbortSignal.abort(),
                fetcher: async () => loadTokenkegIdl(),
                provider,
            }),
        ).rejects.toThrow(/abort/i);
    });

    it('should reject with the abort reason when the abort lands mid-fetch', async () => {
        const controller = new AbortController();
        const reason = new Error('caller cancelled');
        const pending = fetchIdlClient('11111111111111111111111111111111', {
            abortSignal: controller.signal,
            // a transport that wraps the abort in its own rejection — the reason must still win
            fetcher: (_programAddress, config) =>
                new Promise((_resolve, reject) => {
                    config?.abortSignal?.addEventListener('abort', () => reject(new Error('transport wrapper')));
                }),
            provider,
        });

        controller.abort(reason);

        await expect(pending).rejects.toBe(reason);
    });

    it('should pass the signal through to the fetcher', async () => {
        const controller = new AbortController();
        let receivedSignal: AbortSignal | undefined;
        await fetchIdlClient('11111111111111111111111111111111', {
            abortSignal: controller.signal,
            fetcher: async (_programAddress, config) => {
                receivedSignal = config?.abortSignal;
                return loadTokenkegIdl();
            },
            provider,
        });

        expect(receivedSignal).toBe(controller.signal);
    });
});

describe('createLatestIdlFetcher', () => {
    it('should resolve the PMP idl metadata first', async () => {
        const tokenkeg = loadTokenkegIdl();
        const program = address(tokenkeg.program.publicKey);
        const rpc = mockRpc({ [await pmpIdlAddress(program)]: pmpIdlAccount(program, tokenkeg) });

        // no provider passed — the codama engine is the default
        const client = unwrap(await fetchIdlClient(program, { rpc }));

        const [, data] = client.decodeInstructionData<{ amount: bigint }>(transferIx(tokenkeg));
        expect(data).toMatchObject({ amount: 42n });
    });

    it('should fall back to the anchor idl account when PMP has none', async () => {
        const simple = loadSimpleIdl();
        const program = address(simple.address);
        const rpc = mockRpc({ [await anchorIdlAddress(program)]: anchorIdlAccount(simple) });

        const client = unwrap(await fetchIdlClient(program, { rpc }));

        const [, data] = client.decodeInstructionData<{ amount: bigint }>(incrementIx(simple));
        expect(data).toMatchObject({ amount: 42n });
    });

    it('should skip the anchor leg when disabled', async () => {
        const simple = loadSimpleIdl();
        const program = address(simple.address);
        const rpc = mockRpc({ [await anchorIdlAddress(program)]: anchorIdlAccount(simple) });
        const fetcher = createLatestIdlFetcher(rpc, { anchor: false });

        const [error] = await fetchIdlClient(program, { fetcher });

        expect(isIdlError(error, IDL_ERROR__IDL_NOT_FOUND)).toBe(true);
    });

    it('should resolve undefined when neither source has an IDL', async () => {
        const fetcher = createLatestIdlFetcher(mockRpc({}));

        await expect(fetcher('11111111111111111111111111111111')).resolves.toBeUndefined();
    });

    it('should surface a corrupt anchor idl account as the typed parse error', async () => {
        const simple = loadSimpleIdl();
        const program = address(simple.address);
        // valid layout, but the deflated payload inflates to something that is not JSON
        const rpc = mockRpc({ [await anchorIdlAddress(program)]: anchorCorruptIdlAccount() });

        const [error, client] = await fetchIdlClient(program, { rpc });

        expect(client).toBeUndefined();
        expect(isIdlError(error, IDL_ERROR__IDL_PARSE_FAILED)).toBe(true);
    });

    it('should surface a non-JSON PMP idl metadata as the typed parse error', async () => {
        const tokenkeg = loadTokenkegIdl();
        const program = address(tokenkeg.program.publicKey);
        const rpc = mockRpc({ [await pmpIdlAddress(program)]: pmpIdlAccount(program, tokenkeg, Format.Toml) });

        const [error, client] = await fetchIdlClient(program, { rpc });

        expect(client).toBeUndefined();
        expect(isIdlError(error, IDL_ERROR__IDL_PARSE_FAILED)).toBe(true);
    });

    it('should surface unparseable PMP idl content as the typed parse error', async () => {
        const tokenkeg = loadTokenkegIdl();
        const program = address(tokenkeg.program.publicKey);
        const rpc = mockRpc({ [await pmpIdlAddress(program)]: pmpIdlAccount(program, 'not json') });

        const [error, client] = await fetchIdlClient(program, { rpc });

        expect(client).toBeUndefined();
        expect(isIdlError(error, IDL_ERROR__IDL_PARSE_FAILED)).toBe(true);
    });

    it('should not fall through to the anchor leg when the PMP metadata is corrupt', async () => {
        const simple = loadSimpleIdl();
        const program = address(simple.address);
        const rpc = mockRpc({
            [await anchorIdlAddress(program)]: anchorIdlAccount(simple), // a valid fallback that must NOT mask the corruption
            [await pmpIdlAddress(program)]: pmpIdlAccount(program, simple, Format.Toml),
        });

        const [error, client] = await fetchIdlClient(program, { rpc });

        expect(client).toBeUndefined();
        expect(isIdlError(error, IDL_ERROR__IDL_PARSE_FAILED)).toBe(true);
    });
});
