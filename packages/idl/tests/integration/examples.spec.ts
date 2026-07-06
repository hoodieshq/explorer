// Consumer-style examples over the BUILT package ('@explorer/idl' resolves to dist/ — build first).
// Every document is real: SPL Token's PMP codama root, the let_me_buy mainnet Anchor IDL, and the
// workspace simple program.
import {
    createIdlClient,
    getDecodedData,
    IDL_ERROR__UNSUPPORTED_IDL_FORMAT,
    IdlStandard,
    isAnchorStandard,
    isCodamaStandard,
    isIdlError,
    isLegacyAnchorIdl,
    tryCreateIdlClient,
} from '@explorer/idl';
import { address } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import {
    legacyAnchorIdl,
    legacyWithdrawIx,
    loadLetMeBuyIdl,
    loadSimpleIdl,
    loadTokenkegIdl,
    u64le,
} from '../../src/__tests__/fixtures';

describe('integration: untrusted IDL from RPC/PMP', () => {
    it('should go error-first tuple → guards → parsed data (real codama document)', () => {
        // 1. an IDL arrives as unknown JSON (resolve-program-idls, PMP fetch, user upload)
        const fetched: unknown = loadTokenkegIdl();

        // 2. wrap it — no throw on garbage, a typed error instead
        const [error, client] = tryCreateIdlClient(fetched);
        expect(error).toBeUndefined();
        if (!client) throw new Error('unreachable');

        // 3. custom logic via guards (ErrorBoundary/Suspense composition happens out here)
        expect(isCodamaStandard(client)).toBe(true);
        expect(isAnchorStandard(client)).toBe(false);

        // 4. parsed data, no decode needed
        expect(client.programName()).toBe('Token');
        expect(client.instructionName(Uint8Array.from([3, ...u64le(42n)]))).toBe('Transfer');
    });

    it('should handle a real anchor document through the same flow', () => {
        const [error, client] = tryCreateIdlClient(loadLetMeBuyIdl());
        expect(error).toBeUndefined();
        if (!client) throw new Error('unreachable');

        expect(isAnchorStandard(client)).toBe(true);
        expect(client.programName()).toBe('Let Me Buy');
    });

    it('should report unsupported documents with a typed, code-discriminated error', () => {
        const [error, client] = tryCreateIdlClient({ some: 'garbage' });
        expect(client).toBeUndefined();
        // the consumer maps codes — to MCP payload errors, to Logger severities, to UI states
        expect(error && isIdlError(error, IDL_ERROR__UNSUPPORTED_IDL_FORMAT)).toBe(true);
    });
});

describe('integration: receive instruction data', () => {
    it("should decode SPL Token's transfer and hand back the args generically", () => {
        const tokenkeg = loadTokenkegIdl();
        const client = createIdlClient(tokenkeg);

        const decode = client.decodeInstruction({
            accounts: [],
            data: new Uint8Array([3, ...u64le(42n)]),
            programAddress: address(tokenkeg.program.publicKey),
        });

        // the generic accessor returns the parsed args without per-standard digging
        expect(getDecodedData(decode)).toMatchObject({ amount: 42n });
    });

    it('should decode the workspace simple program through the same accessor', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple);
        const increment = simple.instructions.find(item => item.name === 'increment');
        if (!increment) throw new Error('simple must declare increment');

        const decode = client.decodeInstruction({
            accounts: [],
            data: new Uint8Array([...increment.discriminator, ...u64le(42n)]),
            programAddress: address(simple.address),
        });

        expect(getDecodedData(decode)).toMatchObject({ amount: 42n });
    });

    it('should compose the accessor with handler-map dispatch when flows differ per outcome', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple);
        const increment = simple.instructions.find(item => item.name === 'increment');
        if (!increment) throw new Error('simple must declare increment');

        const outcome = client.decodeInstruction(
            {
                accounts: [],
                data: new Uint8Array([...increment.discriminator, ...u64le(42n)]),
                programAddress: address(simple.address),
            },
            {
                anchor: decode => ({ data: getDecodedData(decode), source: 'anchor' }),
                codama: decode => ({ data: getDecodedData(decode), source: 'codama' }),
                unknown: decode => ({ data: getDecodedData(decode), source: 'raw' }),
            },
        );

        expect(outcome.source).toBe('codama');
        expect(outcome.data).toMatchObject({ amount: 42n });
    });
});

describe('integration: injected legacyAnchorDecoder', () => {
    // A realistic gap: the program executes an instruction its published IDL does not declare (an
    // upgrade outran the document). The consumer injects a decoder that knows the missing layout.
    const AIRDROP_DISCRIMINATOR = [9, 9, 9, 9, 9, 9, 9, 9];

    function clientWithLegacyDecoder() {
        return createIdlClient(loadSimpleIdl(), {
            legacyAnchorDecoder: (idl, ix) => {
                const data = ix.data ? Uint8Array.from(ix.data) : new Uint8Array();
                if (!AIRDROP_DISCRIMINATOR.every((byte, i) => data[i] === byte)) return undefined;
                const view = new DataView(data.buffer, data.byteOffset + AIRDROP_DISCRIMINATOR.length);
                return { amount: view.getBigUint64(0, true), name: 'airdrop' };
            },
        });
    }

    it('should produce the anchor arm through the injected decoder when the document misses', () => {
        const simple = loadSimpleIdl();
        const decode = clientWithLegacyDecoder().decodeInstruction({
            accounts: [],
            data: new Uint8Array([...AIRDROP_DISCRIMINATOR, ...u64le(7n)]),
            programAddress: address(simple.address),
        });

        expect(decode.kind).toBe(IdlStandard.Anchor);
        expect(getDecodedData(decode)).toEqual({ amount: 7n, name: 'airdrop' });
    });

    it('should stay on the unknown arm when the injected decoder also misses', () => {
        const simple = loadSimpleIdl();
        const decode = clientWithLegacyDecoder().decodeInstruction({
            accounts: [],
            data: Uint8Array.from([1, 2, 3]),
            programAddress: address(simple.address),
        });

        expect(decode.kind).toBe('unknown');
    });
});

describe('integration: legacy Anchor fallback', () => {
    it('should refuse legacy documents and route them to consumer-owned decoding', () => {
        // the client refuses with a typed error...
        const [error] = tryCreateIdlClient(legacyAnchorIdl);
        expect(error?.code).toBe(IDL_ERROR__UNSUPPORTED_IDL_FORMAT);

        // ...the guard identifies the document, and the consumer decodes it themselves
        // (see legacy-anchor/custom-decoder.spec.ts for a working Borsh-style legacy decoder)
        expect(isLegacyAnchorIdl(legacyAnchorIdl)).toBe(true);
        expect(legacyWithdrawIx.data.length).toBeGreaterThan(8);
    });
});
