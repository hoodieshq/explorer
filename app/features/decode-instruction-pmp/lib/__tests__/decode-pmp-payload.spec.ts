import { Compression, Encoding, Format, packDirectData } from '@solana-program/program-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Logger } from '@/app/shared/lib/logger';

import { PMP_DECODE_BUDGET_BYTES, PMP_DECODED_RENDER_CAP_BYTES, PMP_MAX_PACKED_INPUT_BYTES } from '../constants';
import { decodePmpPayload } from '../decode-pmp-payload';

const DOC = '{"name":"company","version":"1.0.0"}';
/** The same document as `DOC`, indented - a `Format.Json` payload is re-serialised before it reaches the card. */
const DOC_PRETTY = '{\n  "name": "company",\n  "version": "1.0.0"\n}';

// `packDirectData` is the library's own producer, so every fixture below is a byte-exact round trip of what the
// canonical client puts on chain. Its `encoding` argument INTERPRETS the content string, so Utf8 is the only
// realistic choice for a JSON document (with Base64 the content would have to be base64 text already).
function pack(content: string, compression: Compression): Uint8Array {
    return packDirectData({ compression, content, encoding: Encoding.Utf8 }).data as Uint8Array;
}

describe('decodePmpPayload', () => {
    // The Logger is a global no-op mock (test-setup.specs.ts), so these read the calls the decode makes.
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should decode an uncompressed UTF-8 JSON payload into a pretty-printed document', () => {
        const result = decodePmpPayload({
            config: { compression: Compression.None, encoding: Encoding.Utf8, format: Format.Json },
            data: pack(DOC, Compression.None),
        });

        expect(result).toEqual({
            bytes: expect.any(Uint8Array),
            kind: 'decoded',
            text: DOC_PRETTY,
        });
    });

    it('should decompress a Zlib payload before decoding', () => {
        const result = decodePmpPayload({
            config: { compression: Compression.Zlib, encoding: Encoding.Utf8, format: Format.Json },
            data: pack(DOC, Compression.Zlib),
        });

        expect(result.kind === 'decoded' && result.text).toEqual(DOC_PRETTY);
    });

    it('should decompress a Gzip payload before decoding', () => {
        const result = decodePmpPayload({
            config: { compression: Compression.Gzip, encoding: Encoding.Utf8, format: Format.Yaml },
            data: pack('name: company\n', Compression.Gzip),
        });

        expect(result.kind === 'decoded' && result.text).toEqual('name: company\n');
    });

    it('should render Encoding None as hex rather than as text', () => {
        const result = decodePmpPayload({
            config: { compression: Compression.None, encoding: Encoding.None, format: Format.None },
            data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        });

        expect(result.kind === 'decoded' && result.text).toEqual('deadbeef');
    });

    it('should report oversized with the full decompressed bytes when the payload exceeds the cap', () => {
        const result = decodePmpPayload({
            cap: 4,
            config: { compression: Compression.None, encoding: Encoding.Utf8, format: Format.Json },
            data: new Uint8Array([1, 2, 3, 4, 5, 6, 7]),
        });

        expect(result.kind).toBe('oversized');
        expect(result.kind === 'oversized' && result.bytes.length).toBe(7);
    });

    it('should not report oversized when the payload is exactly at the cap', () => {
        const result = decodePmpPayload({
            cap: 4,
            config: { compression: Compression.None, encoding: Encoding.None, format: Format.None },
            data: new Uint8Array([1, 2, 3, 4]),
        });

        expect(result.kind).toBe('decoded');
    });

    it('should default a linear encoding to the shared render cap', () => {
        const result = decodePmpPayload({
            config: { compression: Compression.None, encoding: Encoding.None, format: Format.None },
            data: new Uint8Array(PMP_DECODED_RENDER_CAP_BYTES + 1),
        });

        expect(result).toMatchObject({ budget: PMP_DECODED_RENDER_CAP_BYTES, kind: 'oversized' });
    });

    it('should hold Base58 to a budget well below the shared render cap', () => {
        // `getBase58Decoder()` folds the payload into one BigInt and divides it down, so its cost grows with the
        // SQUARE of the length: at the shared cap a base58 payload blocks the render for minutes. Anything past the
        // base58 budget has to come back oversized rather than reaching `decodeData`.
        const budget = PMP_DECODE_BUDGET_BYTES[Encoding.Base58];
        const result = decodePmpPayload({
            config: { compression: Compression.None, encoding: Encoding.Base58, format: Format.None },
            data: new Uint8Array(budget + 1),
        });

        // Fails if the two are ever collapsed back into one global cap.
        expect(budget).toBeLessThan(PMP_DECODED_RENDER_CAP_BYTES);
        expect(result).toMatchObject({ budget, kind: 'oversized' });
    });

    it('should still decode a Base58 payload that sits inside its budget', () => {
        const result = decodePmpPayload({
            config: { compression: Compression.None, encoding: Encoding.Base58, format: Format.None },
            data: new Uint8Array([1, 2, 3, 4]),
        });

        expect(result.kind).toBe('decoded');
    });

    it('should refuse a packed payload past the unpack limit without decompressing it', () => {
        // Deliberately not a valid stream: reaching `uncompressData` at all would throw and come back as `failed`,
        // so `packed-oversized` proves the length check ran BEFORE the unpack.
        const result = decodePmpPayload({
            config: { compression: Compression.Gzip, encoding: Encoding.Utf8, format: Format.Json },
            data: new Uint8Array(PMP_MAX_PACKED_INPUT_BYTES + 1),
        });

        expect(result).toEqual({
            kind: 'packed-oversized',
            length: PMP_MAX_PACKED_INPUT_BYTES + 1,
            limit: PMP_MAX_PACKED_INPUT_BYTES,
        });
    });

    it('should not apply the unpack limit to an uncompressed payload', () => {
        // `uncompressData` hands `Compression.None` input straight back, so there is nothing to unpack and nothing
        // for the limit to guard. Such a payload has to reach its encoding budget rather than be refused here.
        const result = decodePmpPayload({
            config: { compression: Compression.None, encoding: Encoding.Utf8, format: Format.None },
            data: new Uint8Array(PMP_MAX_PACKED_INPUT_BYTES + 1),
        });

        // What makes this discriminating: the fixture sits between the two limits, past the unpack limit and inside
        // the Utf8 budget. Fails if they are ever moved so close together that it no longer does.
        expect(PMP_MAX_PACKED_INPUT_BYTES).toBeLessThan(PMP_DECODE_BUDGET_BYTES[Encoding.Utf8]);
        expect(result.kind).toBe('decoded');
    });

    it('should report failed with a reason when the compressed stream is corrupt', () => {
        // `uncompressData` surfaces pako's failure by throwing a bare STRING, not an Error, so the reason
        // extraction has to handle a non-Error throw. This test is the guard for that.
        const result = decodePmpPayload({
            config: { compression: Compression.Zlib, encoding: Encoding.Utf8, format: Format.Json },
            data: new Uint8Array([1, 2, 3, 4]),
        });

        expect(result).toEqual({ kind: 'failed', reason: 'incorrect header check' });
    });

    it('should report failed rather than throwing when the compression value is out of range', () => {
        // `uncompressData`'s switch has no default arm, so an out-of-range value returns undefined and the
        // length check then throws a TypeError. The catch has to swallow that too.
        const result = decodePmpPayload({
            config: { compression: 99 as Compression, encoding: Encoding.Utf8, format: Format.Json },
            data: new Uint8Array([1, 2, 3]),
        });

        expect(result.kind).toBe('failed');
    });

    it('should report failed rather than an empty document when the encoding value is out of range', () => {
        const result = decodePmpPayload({
            config: { compression: Compression.None, encoding: 99 as Encoding, format: Format.None },
            data: new Uint8Array([1, 2, 3]),
        });

        expect(result).toEqual({ kind: 'failed', reason: 'unsupported encoding (99)' });
    });

    it('should report a non-string decode result to Sentry, because only our own drift produces it', () => {
        decodePmpPayload({
            config: { compression: Compression.None, encoding: 99 as Encoding, format: Format.None },
            data: new Uint8Array([1, 2, 3]),
        });

        // The encoding value has to ride in `sentryExtras`: plain context fields never leave the console, and the
        // console is suppressed in the browser.
        expect(Logger.warn).toHaveBeenCalledWith(
            expect.stringContaining('non-string'),
            expect.objectContaining({ sentry: true, sentryExtras: expect.objectContaining({ encoding: 99 }) }),
        );
    });

    it('should log a payload that fails its own hints without reporting it to Sentry', () => {
        decodePmpPayload({
            config: { compression: Compression.Zlib, encoding: Encoding.Utf8, format: Format.Json },
            data: new Uint8Array([1, 2, 3, 4]),
        });

        // pako throws a bare string, so the cause is what carries it - `reason` alone would lose the throw site.
        expect(Logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ cause: 'incorrect header check' }),
            expect.objectContaining({ reason: 'incorrect header check' }),
        );
        // Malformed chain data is not an incident, and the `Url`/`External` panels reach this state by design, so
        // an event per render would be pure noise. Fails if `sentry: true` is ever added here.
        expect(Logger.error).not.toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ sentry: true }));
    });

    it('should log at debug when a Json payload does not parse as JSON', () => {
        const result = decodePmpPayload({
            config: { compression: Compression.None, encoding: Encoding.Utf8, format: Format.Json },
            data: pack('not json', Compression.None),
        });

        // The text still renders verbatim, so this is a hint/content mismatch rather than a decode failure.
        expect(result.kind === 'decoded' && result.text).toEqual('not json');
        expect(Logger.debug).toHaveBeenCalledWith(expect.stringContaining('Format.Json'), expect.anything());
        expect(Logger.error).not.toHaveBeenCalled();
        expect(Logger.warn).not.toHaveBeenCalled();
    });

    it('should report zero bytes as empty rather than as a successful blank document', () => {
        // Every encoding decodes nothing to the empty string, so without this state the card renders an empty
        // `pre` styled exactly like a real document. Checked per encoding because each has its own decoder.
        for (const encoding of [Encoding.None, Encoding.Utf8, Encoding.Base58, Encoding.Base64]) {
            const result = decodePmpPayload({
                config: { compression: Compression.None, encoding, format: Format.Json },
                data: new Uint8Array(0),
            });

            expect(result).toEqual({ kind: 'empty' });
        }
    });

    it('should report zero bytes as empty even when the hints declare a compression', () => {
        // pako throws on an empty stream, so without the pre-unpack check an account that simply holds nothing
        // comes back as `failed` with a corrupt-header reason, which reads as data loss rather than emptiness.
        const result = decodePmpPayload({
            config: { compression: Compression.Gzip, encoding: Encoding.Utf8, format: Format.Json },
            data: new Uint8Array(0),
        });

        expect(result).toEqual({ kind: 'empty' });
    });

    it('should report a real stream that decompresses to nothing as empty', () => {
        // A gzip of an empty document is 20 actual bytes, so the pre-unpack check cannot see this one - only the
        // post-unpack check catches it. Built with the library's own producer to prove the shape is reachable.
        const packed = pack('', Compression.Gzip);
        const result = decodePmpPayload({
            config: { compression: Compression.Gzip, encoding: Encoding.Utf8, format: Format.Json },
            data: packed,
        });

        expect(packed.length).toBeGreaterThan(0);
        expect(result).toEqual({ kind: 'empty' });
    });

    it('should log nothing at all when the payload decodes', () => {
        decodePmpPayload({
            config: { compression: Compression.Zlib, encoding: Encoding.Utf8, format: Format.Json },
            data: pack(DOC, Compression.Zlib),
        });

        expect(Logger.debug).not.toHaveBeenCalled();
        expect(Logger.warn).not.toHaveBeenCalled();
        expect(Logger.error).not.toHaveBeenCalled();
    });
});
