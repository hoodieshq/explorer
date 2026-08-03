import { Compression, Encoding, Format, packDirectData } from '@solana-program/program-metadata';
import { describe, expect, it } from 'vitest';

import { PMP_DECODED_RENDER_CAP_BYTES } from '../constants';
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

    it('should default the cap to PMP_DECODED_RENDER_CAP_BYTES', () => {
        const result = decodePmpPayload({
            config: { compression: Compression.None, encoding: Encoding.None, format: Format.None },
            data: new Uint8Array(PMP_DECODED_RENDER_CAP_BYTES + 1),
        });

        expect(result.kind).toBe('oversized');
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
        // `decodeData(_, 99)` returns undefined for the same missing-default-arm reason. Without the explicit
        // guard this comes back as `{ kind: 'decoded' }` carrying an empty document, which would render as a
        // blank successful decode. P2 reads the config from an account header, so it can reach this.
        const result = decodePmpPayload({
            config: { compression: Compression.None, encoding: 99 as Encoding, format: Format.None },
            data: new Uint8Array([1, 2, 3]),
        });

        expect(result).toEqual({ kind: 'failed', reason: 'unsupported encoding (99)' });
    });
});
