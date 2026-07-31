// design.md §3 `boundedUncompress`, copied verbatim, plus a corrected version. Run to see which one holds.

import pako from 'pako';

export class PayloadTooLargeError extends Error {}

/** Verbatim from design.md §3. */
export function boundedUncompressAsDesigned(data, compression, cap) {
    if (compression === 0) return data;
    const inflator = new pako.Inflate({ chunkSize: 16 * 1024, windowBits: 47 });
    let total = 0;
    inflator.onData = chunk => {
        total += chunk.length;
        if (total > cap) throw new PayloadTooLargeError();
        inflator.chunks.push(chunk);
    };
    inflator.push(data, true);
    if (inflator.err) throw new Error(inflator.msg);
    return inflator.result;
}

export class TruncatedStreamError extends Error {}

/**
 * Same guard, but it does not reach into pako's internals, and it checks `ended` rather than assuming a falsy
 * `err` means the stream completed. pako's `push` returns without calling `onEnd` when it runs out of input, so
 * `err` stays 0 and `result` stays `undefined` on a truncated stream. That is exactly the input an INCOMPLETE
 * reconstruction produces, so it is the likely case here, not the exotic one.
 */
export function boundedUncompress(data, compression, cap) {
    if (compression === 0) return data;
    const inflator = new pako.Inflate({ chunkSize: 16 * 1024, windowBits: 47 });
    const chunks = [];
    let total = 0;
    inflator.onData = chunk => {
        total += chunk.length;
        if (total > cap) throw new PayloadTooLargeError();
        chunks.push(chunk);
    };
    inflator.push(data, true);
    if (inflator.err) throw new Error(inflator.msg || `inflate failed with ${inflator.err}`);
    if (!inflator.ended) throw new TruncatedStreamError('compressed stream ended early');
    const out = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
        out.set(c, at);
        at += c.length;
    }
    return out;
}
