// The @explorer/idl client in action — consumer-style flows over the BUILT package ('@explorer/idl'
// resolves to dist/ — build first). Creation/summary/naming sections group by client capability;
// decoding sections group by document flavor (modern Anchor / legacy Anchor / converted / Codama).
// Runtime flows only — the typed getDecodedData routes are demonstrated in idl-client-inference.spec.ts.
// All documents are real:
//   tokenkeg  — SPL Token's PMP-stored Codama root (mainnet snapshot)
//   converted — the generated Anchor document normalized with nodes-from-anchor
//   simple    — modern Anchor program (anchor-lang 1.1.2, test-anchor-programs/simple)
//   simple031 — Anchor 0.31 program (test-anchor-programs/simple-031), fetched through anchor's client (mocked Program.fetchIdl)
//   letMeBuy  — real mainnet Anchor program (Anchor-PDA + PMP snapshots)
import {
    type AnchorIdl,
    type CodamaIdl,
    createIdlClient,
    getIdlStandard,
    IDL_ERROR__IDL_PARSE_FAILED,
    IDL_ERROR__UNSUPPORTED_IDL_FORMAT,
    type IdlDecodeProvider,
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
// conversion is anchor-input-only, engines are opt-in — both live behind their own entries
import { convertToCodama } from '@explorer/idl/anchor';
import { codamaProvider, createCodamaIdlClient, tryCreateCodamaIdlClient } from '@explorer/idl/codama';
import { address, type Instruction } from '@solana/kit';
import { describe, expect, expectTypeOf, it } from 'vitest';

import {
    incrementIx,
    loadLetMeBuyIdl,
    loadLetMeBuyPmpIdl,
    loadSimpleIdl,
    loadTokenkegIdl,
    pre030AnchorIdl,
    pre030WithdrawIx,
    transferIx,
    u64le,
} from '../../src/__tests__/fixtures';
import { fetchSimple031Idl } from '../anchor-helpers';

const TOKENKEG_ADDRESS = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

/** App flow: label an instruction from a transaction using the program's IDL. */
function labelInstruction(rawIdl: unknown, ix: Instruction): string {
    const [error, client] = tryCreateIdlClient(rawIdl);
    if (error) return 'Unknown'; // use the Result — degrade to a label, don't throw
    const name = ix.data ? client.instructionName(Uint8Array.from(ix.data)) : undefined;
    return name ?? 'Unknown';
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

        expect(isCodamaStandard(client)).toBe(false);
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

describe('capability: engine selection (one entry per engine)', () => {
    /** Case: the name-only flow (MCP tools) — the bare entry serves names with NO decode engine loaded. */
    it('should serve names and metadata engine-free without a provider', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple);

        expect(client.programName()).toBe('Simple');
        expect(client.instructionName(incrementIx(simple).data)).toBe('Increment');
        // decoding is structurally AND statically absent — an engine never even loads
        expect('decodeInstruction' in client).toBe(false);
        expectTypeOf(client).not.toHaveProperty('decodeInstruction');
    });

    /** Case: the one-import default-engine path — untrusted input straight to a decoding client. */
    it('should decode untrusted input through the pre-wired codama client', () => {
        const tokenkeg = loadTokenkegIdl();
        const [error, client] = tryCreateCodamaIdlClient(tokenkeg as unknown);
        expect(error).toBeUndefined();
        if (!client) throw new Error('unreachable');

        const decode = client.decodeInstruction(transferIx(tokenkeg));
        expect(client.getDecodedData<{ amount: bigint }>(decode)).toMatchObject({ amount: 42n });
    });

    /** Case: the provider seam heavier engines (the Anchor-rich path) plug into — same client surface. */
    it('should run a consumer-supplied provider through the same client surface', () => {
        const simple = loadSimpleIdl();
        const customEngine: IdlDecodeProvider = {
            decodeAccount: () => ({ errors: [], kind: 'unknown' }),
            decodeInstruction: () => ({ decoded: { note: 'from the custom engine' }, kind: IdlStandard.Anchor }),
        };
        const client = createIdlClient(simple, { provider: customEngine });

        const decode = client.decodeInstruction(incrementIx(simple));
        expect(decode.kind).toBe(IdlStandard.Anchor);
        expect(client.getDecodedData<{ note: string }>(decode)).toEqual({ note: 'from the custom engine' });
    });
});

describe('capability: program summary (address, name, standard)', () => {
    /** Case: address/name/standard read from SPL Token's PMP-stored codama root. */
    it('should summarize SPL Token from its real PMP codama root', () => {
        const [error, client] = tryCreateIdlClient(loadTokenkegIdl());
        expect(error).toBeUndefined();
        if (!client) throw new Error('unreachable');

        expect(client.programAddress()).toBe(TOKENKEG_ADDRESS);
        expect(client.programName()).toBe('Token');
        expect(getIdlStandard(client.idl)).toBe(IdlStandard.Codama);
    });

    /** Case: a nodes-from-anchor conversion result summarizes as a Codama program. */
    it('should summarize the converted Anchor document as a Codama program', () => {
        const simple = loadSimpleIdl();
        const [conversionError, converted] = convertToCodama(simple);
        expect(conversionError).toBeUndefined();

        const [error, client] = tryCreateIdlClient(converted);
        expect(error).toBeUndefined();
        if (!client) throw new Error('unreachable');

        expect(client.programAddress()).toBe(simple.address);
        expect(client.programName()).toBe('Simple');
        expect(client.programVersion()).toBe('0.1.0'); // the program's own semver survives conversion
        // post-conversion the format version is codama's (a codama root), not anchor's spec — value tracks @codama/nodes-from-anchor
        expect(client.formatVersion()).toMatch(/^\d+\.\d+\.\d+$/);
        expect(getIdlStandard(client.idl)).toBe(IdlStandard.Codama);
    });

    /** Case: the workspace anchor-lang 1.1.2 program summarizes as Anchor. */
    it('should summarize the modern Anchor program', () => {
        const [error, client] = tryCreateIdlClient(loadSimpleIdl());
        expect(error).toBeUndefined();
        if (!client) throw new Error('unreachable');

        expect(client.programAddress()).toBe('7u9qtZPjJcQ1jZsZxAGyRM4aGLNXqK5pzawpULopWFqB');
        expect(client.programName()).toBe('Simple');
        expect(client.programVersion()).toBe('0.1.0'); // metadata.version
        expect(client.formatVersion()).toBe('0.1.0'); // metadata.spec — anchor's format version
        expect(getIdlStandard(client.idl)).toBe(IdlStandard.Anchor);
    });

    /** Case: the workspace Anchor 0.31 program, fetched through anchor's client, summarizes as Anchor. */
    it('should summarize the Anchor 0.31 program', async () => {
        const [error, client] = tryCreateIdlClient(await fetchSimple031Idl());
        expect(error).toBeUndefined();
        if (!client) throw new Error('unreachable');

        expect(client.programAddress()).toBe('391y4fKGKUEt7n6HuKrkfGYLdkvnk6rvneR7snKe6wzy');
        expect(client.programName()).toBe('Simple 031');
        expect(getIdlStandard(client.idl)).toBe(IdlStandard.Anchor);
    });

    /** Case: a mainnet program's IDL from its Anchor PDA leg. */
    it('should summarize the real mainnet Anchor program (let_me_buy, Anchor PDA leg)', () => {
        const [error, client] = tryCreateIdlClient(loadLetMeBuyIdl());
        expect(error).toBeUndefined();
        if (!client) throw new Error('unreachable');

        expect(client.programAddress()).toBe('BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya');
        expect(client.programName()).toBe('Let Me Buy');
        expect(getIdlStandard(client.idl)).toBe(IdlStandard.Anchor);
    });

    /** Case: the same program's PMP leg carries the same Anchor-format document. */
    it('should summarize the same program from its PMP leg — Anchor-format there too (PMP is storage, not a format)', () => {
        const [error, client] = tryCreateIdlClient(loadLetMeBuyPmpIdl());
        expect(error).toBeUndefined();
        if (!client) throw new Error('unreachable');

        expect(client.programAddress()).toBe('BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya');
        expect(client.programName()).toBe('Let Me Buy');
        expect(getIdlStandard(client.idl)).toBe(IdlStandard.Anchor);
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

    /** Case: converted documents keep byte-array discriminator resolution (fieldDiscriminatorNode with a bytes default). */
    it('should label instructions through the converted document', () => {
        const simple = loadSimpleIdl();
        const [, converted] = convertToCodama(simple);
        const result = labelInstruction(converted, incrementIx(simple));

        expectTypeOf(result).toEqualTypeOf<string>();
        expect(result).toBe('Increment');
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

describe('decoding: modern Anchor documents', () => {
    /** Case: a mainnet document (runtime snapshot, wide) decodes borsh strings + u64 into camelCased args. */
    it('should decode the real mainnet add_product instruction', () => {
        const letMeBuy = loadLetMeBuyIdl();
        const client = createCodamaIdlClient(letMeBuy);

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

    /** Case: the accessor composes with handler-map dispatch when each outcome needs its own flow. */
    it('should compose the accessor with handler-map dispatch when flows differ per outcome', () => {
        const simple = loadSimpleIdl();
        const client = createIdlClient(simple, { provider: codamaProvider() });

        // anchor is required (it's in an Anchor client's union) though only a legacy decoder makes it fire; codama runs here
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

describe('decoding: legacy Anchor documents', () => {
    // A realistic gap: the program executes an instruction its published IDL does not declare (an
    // upgrade outran the document). The consumer injects a decoder that knows the missing layout.
    const AIRDROP_DISCRIMINATOR = [9, 9, 9, 9, 9, 9, 9, 9];

    function clientWithLegacyDecoder() {
        return createCodamaIdlClient(loadSimpleIdl(), {
            // TODO: either rename to InstructionDecoder, OR support account decoding
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

    /** Case: the handler map routes a legacy-rescued instruction to its anchor branch. */
    it('should dispatch the rescued instruction to the anchor handler', () => {
        const simple = loadSimpleIdl();
        const client = clientWithLegacyDecoder();
        const routed = client.decodeInstruction<{ data: { amount: bigint; name: string } | undefined; source: string }>(
            {
                accounts: [],
                data: new Uint8Array([...AIRDROP_DISCRIMINATOR, ...u64le(7n)]),
                programAddress: address(simple.address),
            },
            {
                anchor: decode => ({
                    data: client.getDecodedData<{ amount: bigint; name: string }>(decode),
                    source: 'anchor',
                }),
                codama: decode => ({
                    data: client.getDecodedData<{ amount: bigint; name: string }>(decode),
                    source: 'codama',
                }),
                unknown: () => ({ data: undefined, source: 'raw' }),
            },
        );

        expect(routed.source).toBe('anchor');
        expect(routed.data).toEqual({ amount: 7n, name: 'airdrop' });
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

describe('decoding: converted Anchor documents (nodes-from-anchor)', () => {
    /** Case: an Anchor document converted with the library conversion decodes like a native root. */
    it('should decode through the converted Anchor document', () => {
        const simple = loadSimpleIdl();
        const [conversionError, converted] = convertToCodama(simple);
        expect(conversionError).toBeUndefined();
        if (!converted) throw new Error('unreachable');

        // the conversion result is the WIDE CodamaIdl (literal types do not survive a runtime
        // conversion), so the client narrows like a native root and the shape stays per-call
        const client = createCodamaIdlClient(converted);

        const decode = client.decodeInstruction(incrementIx(simple));
        const result = client.getDecodedData<{ amount: bigint }>(decode);

        expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | undefined>();
        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(result).toMatchObject({ amount: 42n });
    });
});

describe('decoding: Codama documents', () => {
    /** Case: a codama root decodes a kit instruction; the anchor arm is statically excluded. */
    it("should decode SPL Token's transfer through the real codama root", () => {
        const tokenkeg = loadTokenkegIdl();
        const client = createCodamaIdlClient(tokenkeg);

        const decode = client.decodeInstruction(transferIx(tokenkeg));
        const result = client.getDecodedData<{ amount: bigint }>(decode);

        // the codama client statically excludes the anchor arm
        expectTypeOf(decode).toEqualTypeOf<InstructionDecodeFor<typeof tokenkeg>>();
        expectTypeOf(result).toEqualTypeOf<{ amount: bigint } | undefined>();
        expect(decode.kind).toBe(IdlStandard.Codama);
        expect(result).toMatchObject({ amount: 42n });
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
