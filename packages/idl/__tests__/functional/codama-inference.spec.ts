// Typed getDecodedData routes over the same codama-fixtures IDLs — one case per way a
// consumer can source the payload type. The runtime sweep across every supported IDL lives
// in codama-idls.spec.ts; the cases here stay hand-written because inference IS the subject.
import { type AsDecoded, type CodamaIdl, createIdlClient, IdlStandard } from '@explorer/idl';
// a literal `as const` codama root (test-codama-programs/vault) — its literal type drives inference
import { vaultIdl } from '@explorer/test-idl-program-vault';
// real-world interop: a PUBLISHED renderers-js-generated client (type-only import, erased at runtime)
import type { Multisig as PublishedMultisig } from '@solana-program/token-2022';
import type { Instruction } from '@solana/kit';
import { getLastNodeFromPath } from 'codama';
import blogIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/blog-idl.json';
import exampleIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/example-idl.json';
import mplTokenMetadataIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/mpl-token-metadata-idl.json';
import token2022Idl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/token-2022-idl.json';
import tokenIdl from 'codama-fixtures/packages/dynamic-client/test/programs/idls/token-idl.json';
import { describe, expect, expectTypeOf, it } from 'vitest';

// renderers-js-rendered clients — codama's own codegen; type-only imports, erased at runtime
import type { AccessGrant } from './generated/blog-client/accounts/accessGrant';
import type { Multisig } from './generated/token-client/accounts/multisig';
import type { SyncNativeInstructionData } from './generated/token-client/instructions/syncNative';
import { base16, base64, DEFAULT_ADDRESS, encodeAccount } from '../codama-helpers';

/* eslint-disable @typescript-eslint/consistent-type-assertions -- the imported JSON IDLs are known codama roots (the sweep suite re-proves detection); the Instruction cast bridges codama tooling with the client */

describe('functional: typed getDecodedData routes (dynamic-client test IDLs)', () => {
    describe('literal IDL type — the codama counterpart of the anchor companion type', () => {
        it('should infer instruction args from the IDL type with no generics', () => {
            const client = createIdlClient(vaultIdl);

            // u8 discriminator (1) + u64le amount (42)
            const decode = client.decodeInstruction({
                accounts: [],
                data: Uint8Array.from([1, 42, 0, 0, 0, 0, 0, 0, 0]),
                programAddress: vaultIdl.program.publicKey as Instruction['programAddress'],
            });

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const args = client.getDecodedData(decode);

            expectTypeOf(args).toEqualTypeOf<{ amount: bigint; discriminator: number }>();
            expect(getLastNodeFromPath(decode.decoded.path).name).toBe('deposit');
            expect(args).toEqual({ amount: 42n, discriminator: 1 });
        });

        it('should infer account fields from the IDL type with no generics', () => {
            const client = createIdlClient(vaultIdl);
            const bytes = encodeAccount(vaultIdl, 'vault', { authority: DEFAULT_ADDRESS, count: 7n });

            const decode = client.decodeAccount(bytes);

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const account = client.getDecodedData(decode);

            expectTypeOf(account).toEqualTypeOf<{ authority: string; count: bigint }>();
            expect(account).toEqual({ authority: DEFAULT_ADDRESS, count: 7n });
        });
    });

    describe('hand-written payload signatures — IDLs codama codegen rejects', () => {
        it('should decode the example dataAccount1 account with a hand-written type param', () => {
            // hand-written signature: renderers-js rejects this IDL (circular account defaults)
            // u64 → bigint, option → kit Option object
            type DataAccount1Data = {
                bump: number;
                discriminator: [string, string];
                input: bigint;
                optionalInput: { __option: 'None' } | { __option: 'Some'; value: string };
            };
            const idl = exampleIdl as unknown as CodamaIdl;
            const client = createIdlClient(idl);
            const bytes = encodeAccount(idl, 'dataAccount1', {
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

        it('should decode the mpl-token-metadata editionMarker account with a hand-written type param', () => {
            // hand-written signature: renderers-js emits self-inconsistent PDA helpers for this IDL
            // scalar enums ENCODE by variant name but DECODE to the index
            type EditionMarkerData = { key: number; ledger: [string, string] };
            const idl = mplTokenMetadataIdl as unknown as CodamaIdl;
            const client = createIdlClient(idl);
            // key is a scalar enum discriminator — encoded by variant name
            const bytes = encodeAccount(idl, 'editionMarker', {
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

    describe('rendered client types — AsDecoded bridges renderers-js output', () => {
        /** Case: the consumer flow verbatim — the wide IDL JSON at runtime, the payload type from the rendered client. */
        it('should decode the blog accessGrant account from codec-encoded bytes', () => {
            const idl = blogIdl as unknown as CodamaIdl;
            const client = createIdlClient(idl);
            const bytes = encodeAccount(idl, 'accessGrant', {
                bump: 255,
                discriminator: base16('a737b8ed4af2006d'),
                permissions: base16('00000000'),
                profile: DEFAULT_ADDRESS,
            });

            const decode = client.decodeAccount(bytes);

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            // the payload type comes from the rendered blog client, bridged to parser output
            const data = client.getDecodedData<AsDecoded<AccessGrant>>(decode);

            expectTypeOf(data).toEqualTypeOf<{
                bump: number;
                discriminator: [string, string];
                permissions: [string, string];
                profile: string;
            }>();
            expect(getLastNodeFromPath(result.path).name).toBe('accessGrant');
            expect(data).toEqual({
                bump: 255,
                discriminator: base64('pze47UryAG0='),
                permissions: base64('AAAAAA=='),
                profile: DEFAULT_ADDRESS,
            });
        });

        /** Case: no codama tooling on the encode side — the raw IDL alone is enough to decode hand-built bytes. */
        it('should decode the token syncNative instruction from raw hand-built bytes', () => {
            const idl = tokenIdl as unknown as CodamaIdl;
            const client = createIdlClient(idl);

            // the IDL declares syncNative as a single u8 discriminator (17) with no other data
            const decode = client.decodeInstruction({
                accounts: [],
                data: Uint8Array.from([17]),
                programAddress: idl.program.publicKey as Instruction['programAddress'],
            });

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            // the payload type comes from the rendered token client, bridged to parser output
            const data = client.getDecodedData<AsDecoded<SyncNativeInstructionData>>(decode);

            expectTypeOf(data).toEqualTypeOf<{ discriminator: number }>();
            expect(getLastNodeFromPath(result.path).name).toBe('syncNative');
            expect(data).toEqual({ discriminator: 17 });
        });

        it('should decode the token multisig account from codec-encoded bytes', () => {
            const idl = tokenIdl as unknown as CodamaIdl;
            const client = createIdlClient(idl);
            // multisig carries no discriminator field — it is identified by its exact size
            const bytes = encodeAccount(idl, 'multisig', {
                isInitialized: true,
                m: 1,
                n: 1,
                signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
            });

            const decode = client.decodeAccount(bytes);

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            // the payload type comes from the rendered token client, bridged to parser output
            const data = client.getDecodedData<AsDecoded<Multisig>>(decode);

            expectTypeOf(data).toEqualTypeOf<{ isInitialized: boolean; m: number; n: number; signers: string[] }>();
            expect(getLastNodeFromPath(result.path).name).toBe('multisig');
            expect(data).toEqual({
                isInitialized: true,
                m: 1,
                n: 1,
                signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
            });
        });
    });

    describe('published client types — AsDecoded over @solana-program/token-2022', () => {
        it('should decode the token-2022 multisig account from codec-encoded bytes', () => {
            const idl = token2022Idl as unknown as CodamaIdl;
            const client = createIdlClient(idl);
            const bytes = encodeAccount(idl, 'multisig', {
                isInitialized: true,
                m: 1,
                n: 1,
                signers: Array.from({ length: 11 }, () => DEFAULT_ADDRESS),
            });

            const decode = client.decodeAccount(bytes);

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            const result = decode.decoded;
            // the payload type comes from the PUBLISHED @solana-program/token-2022 client
            const data = client.getDecodedData<AsDecoded<PublishedMultisig>>(decode);

            expectTypeOf(data).toEqualTypeOf<{ isInitialized: boolean; m: number; n: number; signers: string[] }>();
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
