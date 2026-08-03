import { decodeData, uncompressData } from '@solana-program/program-metadata';

import { PMP_DECODED_RENDER_CAP_BYTES } from './constants';
import { toDecodedDocument } from './to-decoded-document';
import type { PmpDecodeConfig, PmpDecodedPayload } from './types';

/**
 * Decodes an inline PMP payload: decompress, enforce the render cap, then decode per `encoding` and present per
 * `format`. Never throws - every failure comes back as `{ kind: 'failed' }` so the card can degrade locally
 * without losing its accounts and config tables.
 *
 * The cap is measured on the DECOMPRESSED bytes and checked BEFORE the encoding step, so an oversized payload is
 * never handed to `decodeData` or `JSON.parse`. That is the cost the cap exists to avoid.
 *
 * TODO: scope is inline bytes only, which are transaction-size bounded, so the library's unbounded pako inflate is safe here. Buffer-sourced (milestone P2) and fetched (milestone P3) bytes are NOT bounded and need the output-bounded inflate.
 */
export function decodePmpPayload({
    config,
    data,
    cap = PMP_DECODED_RENDER_CAP_BYTES,
}: {
    config: PmpDecodeConfig;
    data: Uint8Array;
    cap?: number;
}): PmpDecodedPayload {
    try {
        // `uncompressData` is typed ReadonlyUint8Array but returns the input by reference for Compression.None
        // and a real Uint8Array from pako otherwise, so this is a view cast rather than a copy.
        const bytes = uncompressData(data, config.compression);
        if (bytes.length > cap) {
            return { bytes: bytes.subarray(), kind: 'oversized' };
        }
        const text = decodeData(bytes, config.encoding);
        // `decodeData`'s switch has no default arm, so an out-of-range `encoding` returns undefined instead of
        // throwing, and `toDecodedDocument(undefined, ...)` would then report a successful decode of an empty
        // document. Unreachable in P1, because the typed instruction decoder rejects a bad enum byte first
        // ("Enum discriminator out of range"), but P2 reads the config from an account header where it is not.
        if (typeof text !== 'string') {
            return { kind: 'failed', reason: `unsupported encoding (${config.encoding})` };
        }
        return { bytes: bytes.subarray(), document: toDecodedDocument(text, config.format), kind: 'decoded' };
    } catch (error) {
        return { kind: 'failed', reason: toDecodeFailureReason(error) };
    }
}

/** pako's inflate/ungzip throw a bare string, so `error instanceof Error` is not enough on this path. */
function toDecodeFailureReason(error: unknown): string {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    return 'unknown decode error';
}
