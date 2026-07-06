// The @explorer/idl client in action — consumer-style flows over the BUILT package ('@explorer/idl'
// resolves to dist/ — build first). Sections group by client capability, and each section runs the
// SAME consumer code over every program flavor:
//   codama    — Codama-native root node (PMP style, fixture)
//   tokenkeg  — SPL Token's real PMP-stored Codama root (mainnet snapshot)
//   converted — the generated Anchor document normalized with nodes-from-anchor
//   simple    — modern Anchor program (anchor-lang 1.1.2, programs/simple)
//   simple031 — Anchor 0.31 program (programs/simple-031)
//   letMeBuy  — real mainnet Anchor program (Anchor-PDA + PMP snapshots)
import {
    type AccountDecode,
    type AnchorIdl,
    type CodamaIdl,
    convertToCodama,
    createIdlClient,
    getDecodedData,
    getIdlStandard,
    IDL_ERROR__UNSUPPORTED_IDL_FORMAT,
    IdlStandard,
    type InstructionDecode,
    type InstructionDecodeFor,
    isAnchorStandard,
    isCodamaStandard,
    isIdlError,
    isLegacyAnchorIdl,
    tryCreateIdlClient,
} from '@explorer/idl';
import { address, type Instruction } from '@solana/kit';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    CODAMA_PROGRAM_ADDRESS,
    codamaIdl,
    codamaTransferIx,
    legacyAnchorIdl,
    legacyWithdrawIx,
    loadLetMeBuyIdl,
    loadLetMeBuyPmpIdl,
    loadSimple031Idl,
    loadSimpleIdl,
    loadTokenkegIdl,
    u64le,
} from '../../src/__tests__/fixtures';

/** What the app renders for a program once its IDL is known. */
type ProgramSummary = {
    address: string | undefined;
    name: string | undefined;
    standard: IdlStandard;
};

/** App flow: wrap the incoming document once, then read parsed data. */
function summarizeProgram(rawIdl: unknown): ProgramSummary {
    const [error, client] = tryCreateIdlClient(rawIdl);
    if (error) throw error; // app-side this feeds an ErrorBoundary / MCP error payload
    return {
        address: client.programAddress(),
        name: client.programName(),
        standard: getIdlStandard(client.idl),
    };
}

/** App flow: label an instruction from a transaction using the program's IDL. */
function labelInstruction(rawIdl: unknown, ix: Instruction): string {
    const [error, client] = tryCreateIdlClient(rawIdl);
    if (error) throw error;
    const name = ix.data ? client.instructionName(Uint8Array.from(ix.data)) : undefined;
    return name ?? 'Unknown';
}

/** App flow: decode an instruction from a transaction and hand its args to the renderer. */
function decodeInstructionArgs(rawIdl: unknown, ix: Instruction): unknown {
    const [error, client] = tryCreateIdlClient(rawIdl);
    if (error) throw error;
    const decode = client.decodeInstruction(ix);
    if (decode.kind === 'unknown') throw decode.errors[0] ?? new Error('instruction did not match the IDL');
    return getDecodedData(decode);
}

// Stand-in for fetched account bytes — assembled from the program's own declared discriminator.
function counterAccountData(idl: AnchorIdl): Uint8Array {
    // the IDL JSON keeps the Rust name ("Counter"); only the generated TS type camelCases it
    const counter = (idl.accounts ?? []).find(item => item.name.toLowerCase() === 'counter');
    if (!counter) throw new Error('generated program must declare the counter account');
    return new Uint8Array([...counter.discriminator, ...new Uint8Array(32), ...u64le(7n)]);
}

// Stand-in for a real transaction — an `increment(amount: 42)` call built from the program's own declared discriminator.
function incrementIx(idl: AnchorIdl): Instruction {
    const increment = idl.instructions.find(item => item.name === 'increment');
    if (!increment) throw new Error('generated program must declare increment');
    return {
        accounts: [],
        data: new Uint8Array([...increment.discriminator, ...u64le(42n)]),
        programAddress: address(idl.address),
    };
}

// The library's recommended conversion, unwrapped for test brevity.
function convertedToCodama(idl: AnchorIdl): CodamaIdl {
    const [error, converted] = convertToCodama(idl);
    if (error) throw error;
    return converted;
}

const borshString = (value: string): number[] => {
    const bytes = new TextEncoder().encode(value);
    const length = new Uint8Array(4);
    new DataView(length.buffer).setUint32(0, bytes.length, true);
    return [...length, ...bytes];
};

/** SPL Token `transfer(amount: 42)` against the real Tokenkeg codama root (u8 discriminator 3). */
function tokenkegTransferIx(idl: CodamaIdl): Instruction {
    return {
        accounts: [],
        data: new Uint8Array([3, ...u64le(42n)]),
        programAddress: address(idl.program.publicKey),
    };
}

/** `add_product('store', 'thing', 42)` against the real let_me_buy document, from its own discriminator. */
function addProductIx(idl: AnchorIdl): Instruction {
    const addProduct = idl.instructions.find(item => item.name === 'add_product');
    if (!addProduct) throw new Error('let_me_buy must declare add_product');
    return {
        accounts: [],
        data: new Uint8Array([
            ...addProduct.discriminator,
            ...borshString('store'),
            ...borshString('thing'),
            ...u64le(42n),
        ]),
        programAddress: address(idl.address),
    };
}

describe('capability: client creation from untrusted IDLs', () => {
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

describe('capability: program summary (address, name, standard)', () => {
    it('should summarize a Codama-native program', () => {
        expect(summarizeProgram(codamaIdl)).toEqual({
            address: CODAMA_PROGRAM_ADDRESS,
            name: 'Token Vault',
            standard: IdlStandard.Codama,
        });
    });

    it('should summarize the converted Anchor document as a Codama program', () => {
        const simple = loadSimpleIdl();
        expect(summarizeProgram(convertedToCodama(simple))).toEqual({
            address: simple.address,
            name: 'Simple',
            standard: IdlStandard.Codama,
        });
    });

    it('should summarize the modern Anchor program', () => {
        expect(summarizeProgram(loadSimpleIdl())).toEqual({
            address: '7u9qtZPjJcQ1jZsZxAGyRM4aGLNXqK5pzawpULopWFqB',
            name: 'Simple',
            standard: IdlStandard.Anchor,
        });
    });

    it('should summarize the Anchor 0.31 program', () => {
        expect(summarizeProgram(loadSimple031Idl())).toEqual({
            address: '391y4fKGKUEt7n6HuKrkfGYLdkvnk6rvneR7snKe6wzy',
            name: 'Simple 031',
            standard: IdlStandard.Anchor,
        });
    });

    it('should summarize SPL Token from its real PMP codama root', () => {
        expect(summarizeProgram(loadTokenkegIdl())).toEqual({
            address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
            name: 'Token',
            standard: IdlStandard.Codama,
        });
    });

    it('should summarize the real mainnet Anchor program (let_me_buy, Anchor PDA leg)', () => {
        expect(summarizeProgram(loadLetMeBuyIdl())).toEqual({
            address: 'BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya',
            name: 'Let Me Buy',
            standard: IdlStandard.Anchor,
        });
    });

    it('should summarize the same program from its PMP leg — Anchor-format there too (PMP is storage, not a format)', () => {
        expect(summarizeProgram(loadLetMeBuyPmpIdl())).toEqual({
            address: 'BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya',
            name: 'Let Me Buy',
            standard: IdlStandard.Anchor,
        });
    });
});

describe('capability: instruction naming (discriminator table)', () => {
    it('should label a Codama-native instruction', () => {
        expect(labelInstruction(codamaIdl, codamaTransferIx)).toBe('Transfer');
    });

    it('should NOT label instructions through the converted document (conversion trade-off)', () => {
        // the codama name table only resolves PMP-style int fields, not anchor byte arrays — the
        // native Anchor routes below resolve the same instruction
        const simple = loadSimpleIdl();
        expect(labelInstruction(convertedToCodama(simple), incrementIx(simple))).toBe('Unknown');
    });

    it('should label the modern Anchor program instruction', () => {
        const simple = loadSimpleIdl();
        expect(labelInstruction(simple, incrementIx(simple))).toBe('Increment');
    });

    it('should label the Anchor 0.31 program instruction', () => {
        const simple031 = loadSimple031Idl();
        expect(labelInstruction(simple031, incrementIx(simple031))).toBe('Increment');
    });

    it("should label SPL Token's transfer through the real codama root", () => {
        const tokenkeg = loadTokenkegIdl();
        expect(labelInstruction(tokenkeg, tokenkegTransferIx(tokenkeg))).toBe('Transfer');
    });

    it('should label the real mainnet Anchor program instruction', () => {
        const letMeBuy = loadLetMeBuyIdl();
        expect(labelInstruction(letMeBuy, addProductIx(letMeBuy))).toBe('Add Product');
    });
});

describe('capability: instruction decoding', () => {
    it('should decode a Codama-native instruction', () => {
        const result = decodeInstructionArgs(codamaIdl, codamaTransferIx);

        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(result).toMatchObject({ amount: 42n });
    });

    it('should decode through the converted Anchor document', () => {
        const simple = loadSimpleIdl();
        const result = decodeInstructionArgs(convertedToCodama(simple), incrementIx(simple));

        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(result).toMatchObject({ amount: 42n });
    });

    it('should decode the modern Anchor program instruction', () => {
        const simple = loadSimpleIdl();
        const result = decodeInstructionArgs(simple, incrementIx(simple));

        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(result).toMatchObject({ amount: 42n });
    });

    it('should decode the Anchor 0.31 program instruction', () => {
        const simple031 = loadSimple031Idl();
        const result = decodeInstructionArgs(simple031, incrementIx(simple031));

        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(result).toMatchObject({ amount: 42n });
    });

    it("should decode SPL Token's transfer through the real codama root", () => {
        const tokenkeg = loadTokenkegIdl();
        const result = decodeInstructionArgs(tokenkeg, tokenkegTransferIx(tokenkeg));

        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(result).toMatchObject({ amount: 42n });
    });

    it('should decode the real mainnet Anchor program instruction', () => {
        const letMeBuy = loadLetMeBuyIdl();
        const result = decodeInstructionArgs(letMeBuy, addProductIx(letMeBuy));

        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(result).toMatchObject({
            name: 'thing',
            price: 42n,
            storeName: 'store',
        });
    });
});

describe('capability: receive instruction data (generic accessor)', () => {
    it("should decode SPL Token's transfer and hand back the args generically", () => {
        const tokenkeg = loadTokenkegIdl();
        const client = createIdlClient(tokenkeg);

        const decode = client.decodeInstruction(tokenkegTransferIx(tokenkeg));
        // the generic accessor returns the parsed args without per-standard digging
        const result = getDecodedData(decode);

        // the codama client statically excludes the anchor arm
        expectTypeOf(decode).toEqualTypeOf<InstructionDecodeFor<CodamaIdl>>();
        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(result).toMatchObject({ amount: 42n });
    });

    it('should decode the workspace simple program through the same accessor', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple);

        const decode = client.decodeInstruction(incrementIx(simple));
        const result = getDecodedData(decode);

        // the anchor client keeps every arm (codama engine + injected-decoder anchor arm)
        expectTypeOf(decode).toEqualTypeOf<InstructionDecode>();
        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(result).toMatchObject({ amount: 42n });
    });

    it('should compose the accessor with handler-map dispatch when flows differ per outcome', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple);

        const outcome = client.decodeInstruction(incrementIx(simple), {
            anchor: decode => ({ data: getDecodedData(decode), source: 'anchor' }),
            codama: decode => ({ data: getDecodedData(decode), source: 'codama' }),
            unknown: decode => ({ data: getDecodedData(decode), source: 'raw' }),
        });

        expectTypeOf(outcome).toEqualTypeOf<{ data: unknown; source: string }>();
        expect(outcome.source).toBe('codama');
        expect(outcome.data).toMatchObject({ amount: 42n });
    });
});

describe('capability: account decoding', () => {
    it('should decode raw counter account bytes of the modern Anchor program', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple);

        const decode = client.decodeAccount(counterAccountData(simple));
        const result = getDecodedData(decode);

        expectTypeOf(decode).toEqualTypeOf<AccountDecode>();
        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(result).toMatchObject({
            authority: '11111111111111111111111111111111',
            count: 7n,
        });
    });

    it('should decode raw counter account bytes of the Anchor 0.31 program', () => {
        const simple031 = loadSimple031Idl();
        const client = createIdlClient(simple031);

        const decode = client.decodeAccount(counterAccountData(simple031));
        const result = getDecodedData(decode);

        expectTypeOf(decode).toEqualTypeOf<AccountDecode>();
        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(result).toMatchObject({
            authority: '11111111111111111111111111111111',
            count: 7n,
        });
    });
});

describe('capability: injected legacyAnchorDecoder', () => {
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

        const result = getDecodedData(decode);

        expectTypeOf(decode).toEqualTypeOf<InstructionDecode>();
        expectTypeOf(result).toEqualTypeOf<unknown>();
        expect(decode.kind).toBe(IdlStandard.Anchor);
        expect(result).toEqual({ amount: 7n, name: 'airdrop' });
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

describe('capability: legacy Anchor fallback', () => {
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
