// Runs the SAME consumer-style helpers over every program flavor, against the BUILT package
// ('@explorer/idl' resolves to dist/ — build first). Grouped by client capability so each section
// shows all program variants side by side:
//   codama    — Codama-native root node (PMP style, fixture)
//   tokenkeg  — SPL Token's real PMP-stored Codama root (mainnet snapshot)
//   converted — the generated Anchor document normalized with nodes-from-anchor
//   simple    — modern Anchor program (anchor-lang 1.1.2, programs/simple)
//   simple031 — Anchor 0.31 program (programs/simple-031)
//   letMeBuy  — real mainnet Anchor program (Anchor-PDA snapshot)
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import {
    type AnchorIdl,
    type CodamaIdl,
    createIdlClient,
    getDecodedData,
    getIdlStandard,
    IdlStandard,
    tryCreateIdlClient,
} from '@explorer/idl';
import { address, type Instruction } from '@solana/kit';
import { describe, expect, it } from 'vitest';

import {
    CODAMA_PROGRAM_ADDRESS,
    codamaIdl,
    codamaTransferIx,
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

function convertToCodama(idl: AnchorIdl): CodamaIdl {
    return rootNodeFromAnchor(idl as Parameters<typeof rootNodeFromAnchor>[0]) as unknown as CodamaIdl;
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
        expect(summarizeProgram(convertToCodama(simple))).toEqual({
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
        expect(labelInstruction(convertToCodama(simple), incrementIx(simple))).toBe('Unknown');
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
        expect(decodeInstructionArgs(codamaIdl, codamaTransferIx)).toMatchObject({ amount: 42n });
    });

    it('should decode through the converted Anchor document', () => {
        const simple = loadSimpleIdl();
        expect(decodeInstructionArgs(convertToCodama(simple), incrementIx(simple))).toMatchObject({ amount: 42n });
    });

    it('should decode the modern Anchor program instruction', () => {
        const simple = loadSimpleIdl();
        expect(decodeInstructionArgs(simple, incrementIx(simple))).toMatchObject({ amount: 42n });
    });

    it('should decode the Anchor 0.31 program instruction', () => {
        const simple031 = loadSimple031Idl();
        expect(decodeInstructionArgs(simple031, incrementIx(simple031))).toMatchObject({ amount: 42n });
    });

    it("should decode SPL Token's transfer through the real codama root", () => {
        const tokenkeg = loadTokenkegIdl();
        expect(decodeInstructionArgs(tokenkeg, tokenkegTransferIx(tokenkeg))).toMatchObject({ amount: 42n });
    });

    it('should decode the real mainnet Anchor program instruction', () => {
        const letMeBuy = loadLetMeBuyIdl();
        expect(decodeInstructionArgs(letMeBuy, addProductIx(letMeBuy))).toMatchObject({
            name: 'thing',
            price: 42n,
            storeName: 'store',
        });
    });
});

describe('capability: account decoding', () => {
    it('should decode raw counter account bytes of the modern Anchor program', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple);

        const decode = client.decodeAccount(counterAccountData(simple));

        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(getDecodedData(decode)).toMatchObject({
            authority: '11111111111111111111111111111111',
            count: 7n,
        });
    });

    it('should decode raw counter account bytes of the Anchor 0.31 program', () => {
        const simple031 = loadSimple031Idl();
        const client = createIdlClient(simple031);

        const decode = client.decodeAccount(counterAccountData(simple031));

        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(getDecodedData(decode)).toMatchObject({
            authority: '11111111111111111111111111111111',
            count: 7n,
        });
    });
});
