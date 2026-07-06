// The @explorer/idl client in action — consumer-style flows over the BUILT package ('@explorer/idl'
// resolves to dist/ — build first). Sections group by client capability, and each section runs the
// SAME consumer code over every program flavor (all real documents):
//   tokenkeg  — SPL Token's PMP-stored Codama root (mainnet snapshot)
//   converted — the generated Anchor document normalized with nodes-from-anchor
//   simple    — modern Anchor program (anchor-lang 1.1.2, programs/simple)
//   simple031 — Anchor 0.31 program (programs/simple-031), fetched through anchor's client (mocked Program.fetchIdl)
//   letMeBuy  — real mainnet Anchor program (Anchor-PDA + PMP snapshots)
import {
    type AccountDecode,
    type AnchorIdl,
    type CodamaIdl,
    createIdlClient,
    getIdlStandard,
    IDL_ERROR__IDL_PARSE_FAILED,
    IDL_ERROR__UNSUPPORTED_IDL_FORMAT,
    type IdlError,
    IdlStandard,
    type InstructionDecode,
    type InstructionDecodeFor,
    isAnchorStandard,
    isCodamaStandard,
    isIdlError,
    isLegacyAnchorIdl,
    tryCreateIdlClient,
} from '@explorer/idl';
// the engine lives behind its own entry; codamaProvider is the DEFAULT and never needs passing
import { codamaProvider, convertToCodama } from '@explorer/idl/codama';
import { Program, type Provider } from '@coral-xyz/anchor';
import { address, type Instruction } from '@solana/kit';
import { deflateSync } from 'node:zlib';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    incrementIx,
    loadLetMeBuyIdl,
    loadLetMeBuyPmpIdl,
    loadSimple031Idl,
    loadSimpleIdl,
    loadSimpleIdlTyped,
    loadTokenkegIdl,
    pre030AnchorIdl,
    pre030WithdrawIx,
    type Simple,
    type Simple031,
    transferIx,
    u64le,
} from '../../src/__tests__/fixtures';

const TOKENKEG_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

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

// Stand-in for fetched account bytes — assembled from the program's own declared discriminator.
function counterAccountData(idl: AnchorIdl): Uint8Array {
    // the IDL JSON keeps the Rust name ("Counter"); only the generated TS type camelCases it
    const counter = (idl.accounts ?? []).find(item => item.name.toLowerCase() === 'counter');
    if (!counter) throw new Error('generated program must declare the counter account');
    return new Uint8Array([...counter.discriminator, ...new Uint8Array(32), ...u64le(7n)]);
}

const borshString = (value: string): number[] => {
    const bytes = new TextEncoder().encode(value);
    const length = new Uint8Array(4);
    new DataView(length.buffer).setUint32(0, bytes.length, true);
    return [...length, ...bytes];
};

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

/** The on-chain anchor IDL account: 8-byte discriminator + authority pubkey + vecU8 of zlib-deflated JSON. */
function idlAccountInfo(idl: AnchorIdl): { data: Buffer } {
    const deflated = deflateSync(Buffer.from(JSON.stringify(idl)));
    const length = Buffer.alloc(4);
    length.writeUInt32LE(deflated.length, 0);
    return { data: Buffer.concat([Buffer.alloc(8), Buffer.alloc(32), length, deflated]) };
}

/** The simple-031 document arrives through anchor's client: Program.fetchIdl over a mocked connection (no HTTP). */
async function fetchSimple031Idl(): Promise<Simple031> {
    const raw = loadSimple031Idl();
    const provider = {
        connection: { getAccountInfo: async () => idlAccountInfo(raw) },
    } as unknown as Provider;
    const fetched = await Program.fetchIdl<Simple031>(raw.address, provider);
    if (!fetched) throw new Error('mocked IDL account must resolve');
    return fetched;
}

describe('capability: client creation from untrusted IDLs', () => {
    /** Case: untrusted JSON → error-first wrap → guard narrowing → parsed names, on the real codama root. */
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

    /** Case: the identical untrusted flow accepts a real mainnet Anchor document. */
    it('should handle a real anchor document through the same flow', () => {
        const [error, client] = tryCreateIdlClient(loadLetMeBuyIdl());
        expect(error).toBeUndefined();
        if (!client) throw new Error('unreachable');

        expect(isAnchorStandard(client)).toBe(true);
        expect(client.programName()).toBe('Let Me Buy');
    });

    /** Case: garbage input never throws — it returns a code-discriminated IdlError. */
    it('should report unsupported documents with a typed, code-discriminated error', () => {
        const [error, client] = tryCreateIdlClient({ some: 'garbage' });
        expect(client).toBeUndefined();
        // the consumer maps codes — to MCP payload errors, to Logger severities, to UI states
        expect(error && isIdlError(error, IDL_ERROR__UNSUPPORTED_IDL_FORMAT)).toBe(true);
    });
});

describe('capability: program summary (address, name, standard)', () => {
    /** Case: address/name/standard read from SPL Token's PMP-stored codama root. */
    it('should summarize SPL Token from its real PMP codama root', () => {
        const result = summarizeProgram(loadTokenkegIdl());

        expectTypeOf(result).toEqualTypeOf<ProgramSummary>();
        expect(result).toEqual({
            address: TOKENKEG_ADDRESS,
            name: 'Token',
            standard: IdlStandard.Codama,
        });
    });

    /** Case: a nodes-from-anchor conversion result summarizes as a Codama program. */
    it('should summarize the converted Anchor document as a Codama program', () => {
        const simple = loadSimpleIdl();
        const [conversionError, converted] = convertToCodama(simple);

        expect(conversionError).toBeUndefined();
        const result = summarizeProgram(converted);

        expectTypeOf(result).toEqualTypeOf<ProgramSummary>();
        expect(result).toEqual({
            address: simple.address,
            name: 'Simple',
            standard: IdlStandard.Codama,
        });
    });

    /** Case: the workspace anchor-lang 1.1.2 program summarizes as Anchor. */
    it('should summarize the modern Anchor program', () => {
        const result = summarizeProgram(loadSimpleIdl());

        expectTypeOf(result).toEqualTypeOf<ProgramSummary>();
        expect(result).toEqual({
            address: '7u9qtZPjJcQ1jZsZxAGyRM4aGLNXqK5pzawpULopWFqB',
            name: 'Simple',
            standard: IdlStandard.Anchor,
        });
    });

    /** Case: the workspace Anchor 0.31 program, fetched through anchor's client, summarizes as Anchor. */
    it('should summarize the Anchor 0.31 program', async () => {
        const result = summarizeProgram(await fetchSimple031Idl());

        expectTypeOf(result).toEqualTypeOf<ProgramSummary>();
        expect(result).toEqual({
            address: '391y4fKGKUEt7n6HuKrkfGYLdkvnk6rvneR7snKe6wzy',
            name: 'Simple 031',
            standard: IdlStandard.Anchor,
        });
    });

    /** Case: a mainnet program's IDL from its Anchor PDA leg. */
    it('should summarize the real mainnet Anchor program (let_me_buy, Anchor PDA leg)', () => {
        const result = summarizeProgram(loadLetMeBuyIdl());

        expectTypeOf(result).toEqualTypeOf<ProgramSummary>();
        expect(result).toEqual({
            address: 'BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya',
            name: 'Let Me Buy',
            standard: IdlStandard.Anchor,
        });
    });

    /** Case: the same program's PMP leg carries the same Anchor-format document. */
    it('should summarize the same program from its PMP leg — Anchor-format there too (PMP is storage, not a format)', () => {
        const result = summarizeProgram(loadLetMeBuyPmpIdl());

        expectTypeOf(result).toEqualTypeOf<ProgramSummary>();
        expect(result).toEqual({
            address: 'BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya',
            name: 'Let Me Buy',
            standard: IdlStandard.Anchor,
        });
    });
});

describe('capability: instruction naming (discriminator table)', () => {
    /** Case: a PMP-style constant-u8 discriminator resolves through the codama name table. */
    it("should label SPL Token's transfer through the real codama root", () => {
        const tokenkeg = loadTokenkegIdl();
        const result = labelInstruction(tokenkeg, transferIx(tokenkeg));

        expectTypeOf(result).toEqualTypeOf<string>();
        expect(result).toBe('Transfer');
    });

    /** Case: converted documents lose byte-array discriminator resolution — the known conversion trade-off. */
    it('should NOT label instructions through the converted document (conversion trade-off)', () => {
        // the codama name table only resolves PMP-style int fields, not anchor byte arrays — the
        // native Anchor routes below resolve the same instruction
        const simple = loadSimpleIdl();
        const [, converted] = convertToCodama(simple);
        const result = labelInstruction(converted, incrementIx(simple));

        expectTypeOf(result).toEqualTypeOf<string>();
        expect(result).toBe('Unknown');
    });

    /** Case: a real sha256 byte-array discriminator resolves through the native Anchor route. */
    it('should label the modern Anchor program instruction', () => {
        const simple = loadSimpleIdl();
        const result = labelInstruction(simple, incrementIx(simple));

        expectTypeOf(result).toEqualTypeOf<string>();
        expect(result).toBe('Increment');
    });

    /** Case: the same resolution works on the Anchor 0.31 document fetched through anchor's client. */
    it('should label the Anchor 0.31 program instruction', async () => {
        const simple031 = await fetchSimple031Idl();
        const result = labelInstruction(simple031, incrementIx(simple031));

        expectTypeOf(result).toEqualTypeOf<string>();
        expect(result).toBe('Increment');
    });

    /** Case: snake_case instruction names titleCase for display ('add_product' → 'Add Product'). */
    it('should label the real mainnet Anchor program instruction', () => {
        const letMeBuy = loadLetMeBuyIdl();
        const result = labelInstruction(letMeBuy, addProductIx(letMeBuy));

        expectTypeOf(result).toEqualTypeOf<string>();
        expect(result).toBe('Add Product');
    });
});

describe('capability: instruction decoding', () => {
    /** Case: a codama root decodes a kit instruction; the anchor arm is statically excluded. */
    it("should decode SPL Token's transfer through the real codama root", () => {
        const tokenkeg = loadTokenkegIdl();
        const client = createIdlClient(tokenkeg);

        const decode = client.decodeInstruction(transferIx(tokenkeg));
        const result = client.getDecodedData<{ amount: bigint }>(decode);

        // the codama client statically excludes the anchor arm
        expectTypeOf(decode).toEqualTypeOf<InstructionDecodeFor<typeof tokenkeg>>();
        expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | undefined>();
        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(result).toMatchObject({ amount: 42n });
    });

    /** Case: an Anchor document converted with the library conversion decodes like a native root. */
    it('should decode through the converted Anchor document', () => {
        const simple = loadSimpleIdl();
        const [conversionError, converted] = convertToCodama(simple);
        expect(conversionError).toBeUndefined();
        if (!converted) throw new Error('unreachable');

        // the conversion result is the WIDE CodamaIdl (literal types do not survive a runtime
        // conversion), so the client narrows like a native root and the shape stays per-call
        const client = createIdlClient(converted);

        const decode = client.decodeInstruction(incrementIx(simple));
        const result = client.getDecodedData<{ amount: bigint }>(decode);

        expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | undefined>();
        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(result).toMatchObject({ amount: 42n });
    });

    /** Case: a modern Anchor document decodes through the default codama engine, args inferred. */
    it('should decode the modern Anchor program instruction', () => {
        const simple = loadSimpleIdlTyped();
        const client = createIdlClient(simple);

        const decode = client.decodeInstruction(incrementIx(simple));
        const result = client.getDecodedData(decode);

        // the anchor client keeps every arm (codama engine + injected-decoder anchor arm)
        expectTypeOf(decode).toEqualTypeOf<InstructionDecode>();
        expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | NonNullable<unknown> | undefined>();
        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(result).toMatchObject({ amount: 42n });
    });

    /** Case: the Anchor 0.31 document fetched through anchor's client decodes with args inferred. */
    it('should decode the Anchor 0.31 program instruction', async () => {
        const simple031 = await fetchSimple031Idl();
        const client = createIdlClient(simple031);

        const decode = client.decodeInstruction(incrementIx(simple031));
        const result = client.getDecodedData(decode);

        expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | NonNullable<unknown> | undefined>();
        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(result).toMatchObject({ amount: 42n });
    });

    /** Case: a mainnet document decodes borsh strings + u64 into camelCased args. */
    it('should decode the real mainnet Anchor program instruction', () => {
        const letMeBuy = loadLetMeBuyIdl();
        const client = createIdlClient(letMeBuy);

        const decode = client.decodeInstruction(addProductIx(letMeBuy));
        const result = client.getDecodedData<{ name: string; price: bigint; storeName: string }>(decode);

        expectTypeOf(result).toEqualTypeOf<{ name: string; price: bigint; storeName: string } | undefined>();
        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(result).toMatchObject({
            name: 'thing',
            price: 42n,
            storeName: 'store',
        });
    });
});

describe('capability: receive instruction data (IDL-typed accessor)', () => {
    /** Case: a WIDE runtime document — no compile-time type exists, so the shape is declared per call. */
    it("should decode SPL Token's transfer and hand back the args generically", () => {
        const tokenkeg = loadTokenkegIdl();
        // picking the default engine explicitly — heavier engines (anchor) plug in the same way
        const client = createIdlClient(tokenkeg, { provider: codamaProvider() });

        const decode = client.decodeInstruction(transferIx(tokenkeg));
        // the accessor returns the parsed args without per-standard digging; the runtime document is
        // wide, so the shape is declared per call
        const result = client.getDecodedData<{ amount: bigint }>(decode);

        expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | undefined>();
        expect(result).toMatchObject({ amount: 42n });
    });

    /** Case: the anchor-generated type shipped with the program repo — zero-generic instruction-args inference. */
    it('should infer the instruction payload from the generated program type', () => {
        // the loader pairs the built IDL JSON with target/types (`Program<Simple>` idiom) — the
        // compiler reads arg names/types straight from the anchor build output, no copies
        const simple = loadSimpleIdlTyped();
        const client = createIdlClient(simple);

        const decode = client.decodeInstruction(incrementIx(simple));
        const result = client.getDecodedData(decode);

        expectTypeOf(simple).toEqualTypeOf<Simple>();
        // the union covers every declared instruction: increment({amount}) | initialize (no args → {})
        expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | NonNullable<unknown> | undefined>();
        expect(result).toMatchObject({ amount: 42n });
    });

    /** Case: the same generated type — zero-generic account-fields inference. */
    it('should infer the account payload from the generated program type', () => {
        const simple = loadSimpleIdlTyped();
        const client = createIdlClient(simple);

        // the type's camelCase view matches the codama-DECODED payload keys; only document name
        // reads differ at runtime (the JSON keeps Rust casing, e.g. 'Counter')
        const decode = client.decodeAccount(counterAccountData(simple));
        const result = client.getDecodedData(decode);

        expectTypeOf(result).toEqualTypeOf<{ authority: string; count: bigint } | undefined>();
        expect(result).toMatchObject({
            authority: '11111111111111111111111111111111',
            count: 7n,
        });
    });

    /** Case: the document arrives through anchor's client (Program.fetchIdl<Simple031>) — the fetched value infers too. */
    it("should infer payloads for an IDL fetched with anchor's Program.fetchIdl (mocked transport)", async () => {
        const raw = loadSimple031Idl();
        // no HTTP: the connection serves the anchor IDL PDA account straight from the fixture
        const provider = {
            connection: { getAccountInfo: async () => idlAccountInfo(raw) },
        } as unknown as Provider;

        const fetched = await Program.fetchIdl<Simple031>(raw.address, provider);
        if (!fetched) throw new Error('mocked IDL account must resolve');

        const client = createIdlClient(fetched);
        const result = client.getDecodedData(client.decodeInstruction(incrementIx(fetched)));

        expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | NonNullable<unknown> | undefined>();
        expect(result).toMatchObject({ amount: 42n });
    });

    /** Case: the accessor composes with handler-map dispatch when each outcome needs its own flow. */
    it('should compose the accessor with handler-map dispatch when flows differ per outcome', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple);

        const outcome = client.decodeInstruction(incrementIx(simple), {
            anchor: decode => ({ data: client.getDecodedData<{ amount: bigint }>(decode), source: 'anchor' }),
            codama: decode => ({ data: client.getDecodedData<{ amount: bigint }>(decode), source: 'codama' }),
            unknown: decode => ({ data: client.getDecodedData<{ amount: bigint }>(decode), source: 'raw' }),
        });

        expectTypeOf(outcome).toEqualTypeOf<{ data: { amount: bigint } | undefined; source: string }>();
        expect(outcome.source).toBe('codama');
        expect(outcome.data).toMatchObject({ amount: 42n });
    });
});

describe('capability: account decoding', () => {
    /** Case: raw account bytes decode via the document's declared discriminator, fields inferred (modern Anchor). */
    it('should decode raw counter account bytes of the modern Anchor program', () => {
        const simple = loadSimpleIdlTyped();
        const client = createIdlClient(simple);

        const decode = client.decodeAccount(counterAccountData(simple));
        const result = client.getDecodedData(decode);

        expectTypeOf(decode).toEqualTypeOf<AccountDecode>();
        expectTypeOf(result).toEqualTypeOf<{ authority: string; count: bigint } | undefined>();
        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(result).toMatchObject({
            authority: '11111111111111111111111111111111',
            count: 7n,
        });
    });

    /** Case: the same account decode on the Anchor 0.31 document, held wide — the field shape is passed per call. */
    it('should decode raw counter account bytes of the Anchor 0.31 program', async () => {
        // annotating wide models the fetch-without-a-type situation (Program.fetchIdl with no generic)
        const simple031: AnchorIdl = await fetchSimple031Idl();
        const client = createIdlClient(simple031);

        const decode = client.decodeAccount(counterAccountData(simple031));
        // the deliberate per-call variant: the declared shape types the result exactly
        const result = client.getDecodedData<{ authority: string; count: bigint }>(decode);

        expectTypeOf(decode).toEqualTypeOf<AccountDecode>();
        expectTypeOf(result).toEqualTypeOf<{ authority: string; count: bigint } | undefined>();
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

    /** Case: an instruction the published IDL misses is rescued by the injected decoder → anchor arm. */
    it('should produce the anchor arm through the injected decoder when the document misses', () => {
        const simple = loadSimpleIdl();
        const client = clientWithLegacyDecoder();
        const decode = client.decodeInstruction({
            accounts: [],
            data: new Uint8Array([...AIRDROP_DISCRIMINATOR, ...u64le(7n)]),
            programAddress: address(simple.address),
        });

        const result = client.getDecodedData<{ amount: bigint; name: string }>(decode);

        expectTypeOf(decode).toEqualTypeOf<InstructionDecode>();
        expectTypeOf(result).toEqualTypeOf<{ amount: bigint; name: string } | undefined>();
        expect(decode.kind).toBe(IdlStandard.Anchor);
        expect(result).toEqual({ amount: 7n, name: 'airdrop' });
    });

    /** Case: both the document and the injected decoder miss — the unknown arm, not an error. */
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
    /** Case: a pre-0.30 document gets a typed refusal, and the guard routes it to consumer-owned decoding. */
    it('should refuse legacy documents and route them to consumer-owned decoding', () => {
        // the client refuses with a typed error...
        const [error] = tryCreateIdlClient(pre030AnchorIdl);
        expect(error?.code).toBe(IDL_ERROR__UNSUPPORTED_IDL_FORMAT);

        // ...the guard identifies the document, and the consumer decodes it themselves
        // (see legacy-anchor/custom-decoder.spec.ts for a working Borsh-style legacy decoder)
        expect(isLegacyAnchorIdl(pre030AnchorIdl)).toBe(true);
        expect(pre030WithdrawIx.data.length).toBeGreaterThan(8);
    });
});

describe('built declarations type probe', () => {
    /** Case: dist/*.d.ts must keep the Result tuple precise — toEqualTypeOf fails on `any` degradation. */
    it('should keep the convertToCodama result tuple precisely typed', () => {
        const [conversionError, converted] = convertToCodama(loadSimpleIdl());

        expectTypeOf(converted).toEqualTypeOf<CodamaIdl | undefined>();
        expectTypeOf(conversionError).toEqualTypeOf<IdlError<typeof IDL_ERROR__IDL_PARSE_FAILED> | undefined>();
        expect(conversionError).toBeUndefined();
        expect(converted).toBeDefined();
    });
});
