// The fetch entry — resolve a program's IDL by address, whatever standard the program publishes, and
// build a decode client over it. Subpath-gated so the lean core never loads rpc/PMP machinery.
import { Buffer } from 'buffer';

// not re-exported from anchor's main entry; the deep import also skips the Program/Provider graph
import { decodeIdlAccount } from '@coral-xyz/anchor/dist/cjs/idl.js';
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
import {
    err,
    IDL_ERROR__IDL_ADDRESS_MISMATCH,
    IDL_ERROR__IDL_FETCH_FAILED,
    IDL_ERROR__IDL_NOT_FOUND,
    IDL_ERROR__IDL_PARSE_FAILED,
    IdlError,
    isIdlError,
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
 * PDA as the fallback. Absent on both legs resolves `undefined`; transport failures throw; corrupt
 * data throws `IDL_ERROR__IDL_PARSE_FAILED` without falling through to the other leg (corruption is
 * surfaced, not masked); the signal reaches every rpc read.
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

export type FetchIdlClientOptions = IdlClientOptions & {
    abortSignal?: AbortSignal;
    /** Reject an IDL declaring a DIFFERENT program address (default true) — registries and custom fetchers can serve mislabeled ones. */
    verifyAddress?: boolean;
} & ({ fetcher?: undefined; rpc: IdlFetcherRpc } | { fetcher: IdlFetcher; rpc?: IdlFetcherRpc });

/**
 * Resolve a program's IDL by address and build a decode client over it — `decodeInstruction` /
 * `decodeAccount` work regardless of which standard the program publishes. The fetcher DEFAULTS to
 * {@link createLatestIdlFetcher} over `rpc` (pass `fetcher` to bring any other source: a registry, a
 * cache, an anchor-provider wrap) and the decode engine defaults to the codama provider. Every data
 * outcome is a Result value: absent IDL → `IDL_ERROR__IDL_NOT_FOUND`, corrupt on-chain data →
 * `IDL_ERROR__IDL_PARSE_FAILED`, transport failures → `IDL_ERROR__IDL_FETCH_FAILED` with the cause;
 * only an abort REJECTS, with the abort reason.
 */
export async function fetchIdlClient(
    programAddress: string,
    options: FetchIdlClientOptions,
): Promise<Result<IdlClient>> {
    const { abortSignal, fetcher, rpc, verifyAddress = true, ...clientOptions } = options;
    abortSignal?.throwIfAborted();
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- the options union guarantees `rpc` whenever `fetcher` is absent; TS drops that correlation on destructuring
    const resolveIdl = fetcher ?? createLatestIdlFetcher(rpc as IdlFetcherRpc);

    let idl: unknown;
    try {
        idl = await resolveIdl(programAddress, abortSignal ? { abortSignal } : undefined);
    } catch (cause) {
        // caller-initiated — not a data outcome; the reason (always set once aborted), not whatever wrapper the transport rejected with
        if (abortSignal?.aborted) throw abortSignal.reason;
        // a leg's own coded error (data corruption → IDL_PARSE_FAILED) — pass it through, don't relabel it a transport failure
        if (isIdlError(cause)) return err(cause);
        return err(new IdlError(IDL_ERROR__IDL_FETCH_FAILED, { cause }));
    }
    if (idl === undefined) return err(new IdlError(IDL_ERROR__IDL_NOT_FOUND, { programAddress }));

    const [createError, client] = tryCreateIdlClient(idl, clientOptions);
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
        throw new IdlError(IDL_ERROR__IDL_PARSE_FAILED, { operation: 'pmp idl metadata format' });
    }
    // url-sourced payloads go through global fetch — only the metadata read above is signal-bound
    const content = await unpackAndFetchData({ rpc, ...metadata.data });
    try {
        return JSON.parse(content);
    } catch (cause) {
        throw new IdlError(IDL_ERROR__IDL_PARSE_FAILED, { cause, operation: 'pmp idl content' });
    }
}

/**
 * Anchor leg — mirrors anchor's `Program.fetchIdl` (idl PDA → account → decode → inflate → parse),
 * kit-native address derivation and abortable rpc reads.
 */
async function fetchAnchorPdaIdl(rpc: IdlFetcherRpc, program: Address, abortSignal?: AbortSignal): Promise<unknown> {
    const [baseAddress] = await getProgramDerivedAddress({ programAddress: program, seeds: [] });
    const idlAddress = await createAddressWithSeed({ baseAddress, programAddress: program, seed: 'anchor:idl' });
    const { value } = await rpc.getAccountInfo(idlAddress, { encoding: 'base64' }).send({ abortSignal });
    if (!value) return undefined;
    const bytes = getBase64Encoder().encode(value.data[0]);
    try {
        // anchor's own account decoder (authority + deflated data vec) — parity by reuse, not by reimplementing the layout
        const idlAccount = decodeIdlAccount(Buffer.from(bytes.buffer, bytes.byteOffset + 8, bytes.length - 8));
        const inflated = await inflate(idlAccount.data);
        return JSON.parse(new TextDecoder().decode(inflated));
    } catch (cause) {
        throw new IdlError(IDL_ERROR__IDL_PARSE_FAILED, { cause, operation: 'anchor idl account data' });
    }
}

// zlib inflate via the standard DecompressionStream (Node >= 18, all modern browsers) — the format
// anchor's pako.inflate produces, with zero dependency.
async function inflate(deflated: Uint8Array): Promise<Uint8Array> {
    const stream = new Blob([deflated]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
}
