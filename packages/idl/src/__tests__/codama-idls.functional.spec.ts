// Functional sweep of the codama engine over EXTERNAL real-program IDLs — codama's own
// dynamic-client test documents (the `codama-fixtures` sha-pinned tarball, imported at their source
// revision, never copied) plus the memo PMP snapshot. The convert counterpart is
// convert-sweep.functional.spec.ts; the typed routes over these documents live in
// __tests__/codama-inference.spec.ts.
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
import { describe, expect, it } from 'vitest';

// mainnet PMP snapshot in test-codama-programs (fetched with the @solana-program/program-metadata CLI)
import memoIdl from '@explorer/test-idl-program-memo/idl';

import { createIdlClient, isCodamaStandard, tryCreateIdlClient } from '../client';
import { IDL_ERROR__INSTRUCTION_DECODE_FAILED } from '../errors';
import { type CodamaIdl, IdlStandard } from '../types';
import { buildInstruction, fetchedJson } from './codama-helpers';
import { unwrap } from './unwrap';

/* eslint-disable @typescript-eslint/consistent-type-assertions -- the imported JSON documents are known codama roots (detection is re-proven per test); the Instruction cast bridges codama tooling with the client */

// Every document decodes one instruction built by codama's OWN dynamic client; the rows share one
// widened type (CodamaIdl), so a table loses no inference — typed routes live in the other suite.
// 9 of the 12 fixtures — the other 3 declare no discriminator nodes, so a decode-success test is
// impossible for them; they live in DISCRIMINATOR_LESS_DOCUMENTS with the unknown-arm contract.
const DECODABLE_DOCUMENTS = [
    {
        document: associatedTokenAccountIdl as unknown as CodamaIdl,
        instruction: 'create',
        name: 'associated-token-account',
    },
    { document: blogIdl as unknown as CodamaIdl, instruction: 'subscribe', name: 'blog' },
    { document: exampleIdl as unknown as CodamaIdl, instruction: 'noArguments', name: 'example' },
    { document: mplTokenMetadataIdl as unknown as CodamaIdl, instruction: 'puffMetadata', name: 'mpl-token-metadata' },
    { document: pmpIdl as unknown as CodamaIdl, instruction: 'setImmutable', name: 'pmp' },
    { document: sasIdl as unknown as CodamaIdl, instruction: 'emitEvent', name: 'sas' },
    { document: systemProgramIdl as unknown as CodamaIdl, instruction: 'upgradeNonceAccount', name: 'system-program' },
    { document: tokenIdl as unknown as CodamaIdl, instruction: 'syncNative', name: 'token' },
    { document: token2022Idl as unknown as CodamaIdl, instruction: 'syncNative', name: 'token-2022' },
];

// These documents declare no instruction discriminators — identification can only miss safely.
const DISCRIMINATOR_LESS_DOCUMENTS = [
    { document: circularAccountRefsIdl as unknown as CodamaIdl, name: 'circular-account-refs' },
    { document: collectionTypesIdl as unknown as CodamaIdl, name: 'collection-types' },
    { document: customResolversTestIdl as unknown as CodamaIdl, name: 'custom-resolvers-test' },
];

describe('functional: Codama documents (dynamic-client test IDLs)', () => {
    describe.each(DECODABLE_DOCUMENTS)('$name', ({ document, instruction }) => {
        it('should wrap the untrusted document into a codama client', () => {
            const client = unwrap(tryCreateIdlClient(fetchedJson(document)));

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        it(`should decode the ${instruction} instruction built by the dynamic client`, async () => {
            const client = createIdlClient(document);

            const decode = client.decodeInstruction(await buildInstruction(document, instruction));

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            expect(getLastNodeFromPath(decode.decoded.path).name).toBe(instruction);
        });
    });

    describe.each(DISCRIMINATOR_LESS_DOCUMENTS)('$name', ({ document }) => {
        it('should wrap the untrusted document into a codama client', () => {
            const client = unwrap(tryCreateIdlClient(fetchedJson(document)));

            expect(isCodamaStandard(client)).toBe(true);
            expect(client.programAddress()).toBe(document.program.publicKey);
        });

        /** Case: identification is discriminator-driven — this document declares none, so decoding can only miss safely. */
        it('should stay on the unknown arm when instructions declare no discriminators', () => {
            const client = createIdlClient(document);

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

    // SPL Memo v4: ONE instruction, remainder utf8 arg, no discriminator — a real PMP snapshot, the
    // fixtures tarball ships no such document. codama merged a single-candidate identification
    // fallback (https://github.com/codama-idl/codama/pull/1010); it ships with dynamic-parsers 1.2.3.
    describe('memo (single discriminator-less instruction)', () => {
        const document = memoIdl as unknown as CodamaIdl;

        function decodeMemo() {
            const client = createIdlClient(document);
            const decode = client.decodeInstruction({
                accounts: [],
                data: new TextEncoder().encode('Hello, Memo!'),
                programAddress: document.program.publicKey as Instruction['programAddress'],
            });
            return { client, decode };
        }

        // DELETE this case when unskipping the one below — it pins the pre-fallback behavior on purpose
        it('should stay on the unknown arm until the dynamic-parsers fallback ships', () => {
            const { decode } = decodeMemo();

            if (decode.kind !== 'unknown') throw new Error('expected the unknown arm');
            expect(decode.errors.every(error => error.code === IDL_ERROR__INSTRUCTION_DECODE_FAILED)).toBe(true);
        });

        // unskip after bumping @codama/dynamic-parsers to >= 1.2.3
        it.skip('should decode the single discriminator-less instruction via the fallback', () => {
            const { client, decode } = decodeMemo();

            if (decode.kind !== IdlStandard.Codama) throw new Error('expected the codama arm');

            expect(getLastNodeFromPath(decode.decoded.path).name).toBe('addMemo');
            expect(client.getDecodedData<{ memo: string }>(decode)).toEqual({ memo: 'Hello, Memo!' });
        });
    });
});
