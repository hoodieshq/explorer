import { Compression, decodeData, Format, uncompressData } from '@solana-program/program-metadata';

import { Logger } from '@/app/shared/lib/logger';

import { PMP_DECODE_BUDGET_BYTES, PMP_MAX_PACKED_INPUT_BYTES } from './constants';
import type { PmpDecodeConfig, PmpDecodedPayload } from './types';

/**
 * Decodes an inline PMP payload: decompress, enforce the decode budget, then decode per `encoding` and present per
 * `format`. Never throws - every failure comes back as `{ kind: 'failed' }` so the card can degrade locally
 * without losing its accounts and config tables.
 *
 * Two bounds apply, because they guard different costs:
 * - `PMP_MAX_PACKED_INPUT_BYTES` on the PACKED bytes of a COMPRESSED payload, before `uncompressData` sees them at
 *   all, because a small deflate stream can inflate into hundreds of megabytes.
 * - the per-encoding budget on the DECOMPRESSED bytes, checked BEFORE the encoding step so an oversized payload is
 *   never handed to `decodeData` or `JSON.parse`. That is the cost the budget exists to avoid, and it is where the
 *   render stays responsive: with `Encoding.Base58` the decode is quadratic. See `PMP_DECODE_BUDGET_BYTES`.
 *
 * `cap` overrides the per-encoding budget for the whole call. It exists so tests and stories can reach the guard
 * states without building a fixture hundreds of kilobytes wide.
 *
 * Zero payload bytes come back as `empty`, never as `decoded`. Every encoding decodes nothing to the empty string,
 * which would otherwise render as a blank document styled exactly like a successful one.
 */
export function decodePmpPayload({
    config,
    data,
    cap,
}: {
    config: PmpDecodeConfig;
    data: Uint8Array;
    cap?: number;
}): PmpDecodedPayload {
    const budget = cap ?? PMP_DECODE_BUDGET_BYTES[config.encoding];

    // Outside the `try` on purpose: a length comparison cannot throw, and putting it here makes it obvious that
    // nothing has touched the packed bytes yet.
    if (config.compression !== Compression.None && data.length > PMP_MAX_PACKED_INPUT_BYTES) {
        return { kind: 'packed-oversized', length: data.length, limit: PMP_MAX_PACKED_INPUT_BYTES };
    }

    // Checked before the unpack, not just after it: pako throws on an empty stream, so a declared compression would
    // otherwise report an account that simply holds nothing as a corrupt one.
    if (data.length === 0) {
        return { kind: 'empty' };
    }

    try {
        // `uncompressData` is typed ReadonlyUint8Array but returns the input by reference for Compression.None
        // and a real Uint8Array from pako otherwise, so this is a view cast rather than a copy.
        const bytes = uncompressData(data, config.compression);
        if (bytes.length > budget) {
            return { budget, bytes: bytes.subarray(), kind: 'oversized' };
        }

        if (bytes.length === 0) {
            return { kind: 'empty' };
        }

        const text = decodeData(bytes, config.encoding);
        if (typeof text !== 'string') {
            // No validated config can reach this: both entry points narrow `encoding` to the library enum first.
            // If it fires, `Encoding` grew a variant whose decoder returns something other than a string, and
            // every card holding that encoding renders a decode failure. Reported, because it is our drift.
            Logger.warn('[pmp:decode-payload] decodeData returned a non-string for a declared encoding', {
                sentry: true,
                sentryExtras: { compression: config.compression, encoding: config.encoding },
            });
            return { kind: 'failed', reason: `unsupported encoding (${config.encoding})` };
        }

        return { bytes: bytes.subarray(), kind: 'decoded', text: toDocumentText(text, config.format) };
    } catch (error) {
        const reason = toDecodeFailureReason(error);
        Logger.error(new Error('[pmp:decode-payload] failed to decode', { cause: error }), {
            compression: config.compression,
            encoding: config.encoding,
            reason,
        });
        return { kind: 'failed', reason };
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
 * Only `Json` is re-serialised with indentation so a minified document is readable.
 * Yaml/Toml/None stay verbatim - no parser library is pulled in.
 */
export function toDocumentText(text: string, format: Format): string {
    if (format !== Format.Json) {
        return text;
    }
    try {
        // Every JSON value stringifies back to a string, scalars included, so no shape needs special-casing.
        return JSON.stringify(JSON.parse(text), undefined, 2);
    } catch (error) {
        Logger.debug('[pmp:decode-payload] payload declares Format.Json but does not parse as JSON', { error });
        return text;
    }
}
