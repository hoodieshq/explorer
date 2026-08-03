import { decodeData, uncompressData } from '@solana-program/program-metadata';
import { Format } from '@solana-program/program-metadata';

import { PMP_DECODED_RENDER_CAP_BYTES } from './constants';
import type { PmpDecodeConfig, PmpDecodedPayload } from './types';

/**
 * Decodes an inline PMP payload: decompress, enforce the render cap, then decode per `encoding` and present per
 * `format`. Never throws - every failure comes back as `{ kind: 'failed' }` so the card can degrade locally
 * without losing its accounts and config tables.
 *
 * The cap is measured on the DECOMPRESSED bytes and checked BEFORE the encoding step, so an oversized payload is
 * never handed to `decodeData` or `JSON.parse`. That is the cost the cap exists to avoid.
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
        if (typeof text !== 'string') {
            return { kind: 'failed', reason: `unsupported encoding (${config.encoding})` };
        }

        return { bytes: bytes.subarray(), kind: 'decoded', text: toDocumentText(text, config.format) };
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

/**
 * Renders an already-decoded payload string for display.
 * Only `Json` is is re-serialised with indentation so a minified document is readable.
 * Yaml/Toml/None stay verbatim - no parser library is pulled in.
 */
export function toDocumentText(text: string, format: Format): string {
    if (format !== Format.Json) {
        return text;
    }
    try {
        // Every JSON value stringifies back to a string, scalars included, so no shape needs special-casing.
        return JSON.stringify(JSON.parse(text), undefined, 2);
    } catch {
        return text;
    }
}
