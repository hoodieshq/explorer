// The fetch entry — resolve a program's IDL by address, whatever standard the program publishes, and
// build a decode client over it. Subpath-gated so the lean core never loads rpc/PMP machinery.
import { fetchMaybeMetadataFromSeeds, Format, unpackAndFetchData } from '@solana-program/program-metadata';
import {
    type Address,
    address as assertAddress,
    createAddressWithSeed,
    type GetAccountInfoApi,
    getBase64Encoder,
    getProgramDerivedAddress,
    type Rpc,
} from '@solana/kit';

import { type IdlClient, type IdlClientOptions, tryCreateIdlClient } from '../client.js';
import { codamaProvider } from '../codama/index.js';
import {
    err,
    IDL_ERROR__IDL_ADDRESS_MISMATCH,
    IDL_ERROR__IDL_FETCH_FAILED,
    IDL_ERROR__IDL_NOT_FOUND,
    IdlError,
    ok,
    type Result,
} from '../errors.js';
import type { IdlFetcher } from '../types.js';

/** The rpc surface both fetch legs need — `createSolanaRpc(url)` satisfies it. */
export type IdlFetcherRpc = Rpc<GetAccountInfoApi>;

export type LatestIdlFetcherOptions = {
    /** Skip the Anchor-PDA leg — native/builtin programs cannot have one and some RPCs throw for the derived PDA. */
    anchor?: boolean;
    /** Non-canonical PMP metadata authority; canonical (`null`) by default. */
    authority?: Address | null;
};

/**
 * The default resolution — a program's "latest" IDL: the PMP `idl` metadata first, the Anchor IDL
 * PDA as the fallback. Absent on both legs resolves `undefined`; transport failures throw; the
 * signal reaches every rpc read.
 */
export function createLatestIdlFetcher(rpc: IdlFetcherRpc, options: LatestIdlFetcherOptions = {}): IdlFetcher {
    const { anchor = true, authority = null } = options;
    return async (programAddress, config) => {
        config?.abortSignal?.throwIfAborted();
        const program = assertAddress(programAddress);
        const pmp = await fetchPmpIdl(rpc, program, authority, config?.abortSignal);
        if (pmp !== undefined) return pmp;
        return anchor ? fetchAnchorPdaIdl(rpc, program, config?.abortSignal) : undefined;
    };
}

export type FetchIdlClientOptions = Omit<IdlClientOptions, 'provider'> & {
    abortSignal?: AbortSignal;
    /** The decode engine — the codama engine by default; pass one to swap (e.g. a future anchor-rich engine). */
    provider?: IdlClientOptions['provider'];
    /** Reject an IDL declaring a DIFFERENT program address (default true) — registries and custom fetchers can serve mislabeled ones. */
    verifyAddress?: boolean;
} & ({ fetcher?: undefined; rpc: IdlFetcherRpc } | { fetcher: IdlFetcher; rpc?: IdlFetcherRpc });

/**
 * Resolve a program's IDL by address and build a decode client over it — `decodeInstruction` /
 * `decodeAccount` work regardless of which standard the program publishes. The fetcher DEFAULTS to
 * {@link createLatestIdlFetcher} over `rpc` (pass `fetcher` to bring any other source: a registry, a
 * cache, an anchor-provider wrap) and the decode engine defaults to the codama provider. Absent IDL →
 * `IDL_ERROR__IDL_NOT_FOUND` in the Result; transport failures → `IDL_ERROR__IDL_FETCH_FAILED` with
 * the cause; an abort REJECTS with the abort reason.
 */
export async function fetchIdlClient(
    programAddress: string,
    options: FetchIdlClientOptions,
): Promise<Result<IdlClient>> {
    const { abortSignal, fetcher, provider = codamaProvider(), rpc, verifyAddress = true, ...clientOptions } = options;
    abortSignal?.throwIfAborted();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the options union guarantees `rpc` whenever `fetcher` is absent; TS drops that correlation on destructuring
    const resolveIdl = fetcher ?? createLatestIdlFetcher(rpc as IdlFetcherRpc);

    let idl: unknown;
    try {
        idl = await resolveIdl(programAddress, abortSignal ? { abortSignal } : undefined);
    } catch (cause) {
        if (abortSignal?.aborted) throw cause; // caller-initiated — not a data outcome
        return err(new IdlError(IDL_ERROR__IDL_FETCH_FAILED, { cause }));
    }
    if (idl === undefined) return err(new IdlError(IDL_ERROR__IDL_NOT_FOUND, { programAddress }));

    const [createError, client] = tryCreateIdlClient(idl, { ...clientOptions, provider });
    if (createError) return err(createError);
    const declaredAddress = client.programAddress();
    if (verifyAddress && declaredAddress && declaredAddress !== programAddress) {
        return err(new IdlError(IDL_ERROR__IDL_ADDRESS_MISMATCH, { declaredAddress, programAddress }));
    }
    return ok(client);
}

/** PMP leg — the canonical @solana-program/program-metadata client owns seeds, encodings, compression. */
async function fetchPmpIdl(
    rpc: IdlFetcherRpc,
    program: Address,
    authority: Address | null,
    abortSignal?: AbortSignal,
): Promise<unknown> {
    const metadata = await fetchMaybeMetadataFromSeeds(rpc, { authority, program, seed: 'idl' }, { abortSignal });
    if (!metadata.exists) return undefined;
    if (metadata.data.format !== Format.Json) {
        throw new Error(`the PMP idl metadata for ${program} is not JSON-formatted`);
    }
    // url-sourced payloads go through global fetch — only the metadata read above is signal-bound
    const content = await unpackAndFetchData({ rpc, ...metadata.data });
    return JSON.parse(content);
}

/**
 * Anchor leg — mirrors anchor's `Program.fetchIdl` (idl PDA → account → skip the discriminator and
 * authority header → inflate → parse), kit-native and abortable. Account layout: 8-byte
 * discriminator, 32-byte authority, u32 LE data length, zlib-deflated JSON.
 */
async function fetchAnchorPdaIdl(rpc: IdlFetcherRpc, program: Address, abortSignal?: AbortSignal): Promise<unknown> {
    const [baseAddress] = await getProgramDerivedAddress({ programAddress: program, seeds: [] });
    const idlAddress = await createAddressWithSeed({ baseAddress, programAddress: program, seed: 'anchor:idl' });
    const { value } = await rpc.getAccountInfo(idlAddress, { encoding: 'base64' }).send({ abortSignal });
    if (!value) return undefined;
    const bytes = getBase64Encoder().encode(value.data[0]);
    const dataLength = new DataView(bytes.buffer, bytes.byteOffset).getUint32(40, true);
    const inflated = await inflate(bytes.slice(44, 44 + dataLength));
    return JSON.parse(new TextDecoder().decode(inflated));
}

// zlib inflate via the standard DecompressionStream (Node >= 18, all modern browsers) — the format
// anchor's pako.inflate produces, with zero dependency.
async function inflate(deflated: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([deflated]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}
