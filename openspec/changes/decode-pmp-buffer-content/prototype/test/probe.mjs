// Library-behaviour probe. `node openspec/changes/decode-pmp-buffer-content/prototype/test/probe.mjs`
//
// NOT a fixture runner. `run.mjs` exercises the ALGORITHM against synthetic histories. This file exercises the
// ASSUMPTIONS design.md makes about the installed @solana-program/program-metadata@0.7.0 and pako@2.1.0, and prints
// what actually happened, one line per assumption, marking every divergence from the doc.
//
// It deliberately calls the library functions design.md's own snippets call, notably kit's `unwrapOption`, rather
// than the local `unwrap` helper in src/decode-ix.mjs. That is the point: the local helper routes around a defect
// in the doc's snippet, so only a probe that uses the real function can see it.
//
// pako coverage here is limited to what run.mjs section 5 does NOT cover (default chunkSize, the missing type
// declarations, overshoot bounding, and `result` after the cap throw). The inflate/gzip/bomb/truncated-stream
// checks live in run.mjs.

import {
    Compression,
    DataSource,
    decodeData,
    Encoding,
    Format,
    getAllocateDiscriminatorBytes,
    getCloseDiscriminatorBytes,
    getExtendDiscriminatorBytes,
    getExternalDataDecoder,
    getExternalDataEncoder,
    getInitializeDiscriminatorBytes,
    getInitializeInstructionDataDecoder,
    getInitializeInstructionDataEncoder,
    getSetDataDiscriminatorBytes,
    getSetDataInstructionDataDecoder,
    getSetDataInstructionDataEncoder,
    getWriteDiscriminatorBytes,
    getWriteInstructionDataDecoder,
    getWriteInstructionDataEncoder,
    unpackExternalData,
} from '@solana-program/program-metadata';
import { none, some, unwrapOption } from '@solana/kit';
import pako from 'pako';

const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

const ZERO_ADDRESS = '11111111111111111111111111111111';

let differs = 0;

function claim(text) {
    process.stdout.write(`\nCLAIM   ${text}\n`);
}

function actual(text, matches) {
    if (!matches) differs += 1;
    process.stdout.write(`ACTUAL  ${text}  ${matches ? `${GREEN}[MATCHES DOC]${RESET}` : `${RED}[DIFFERS]${RESET}`}\n`);
}

function note(text) {
    process.stdout.write(`${DIM}        ${text}${RESET}\n`);
}

const hex = bytes => Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');

/** Returns the thrown value instead of letting it escape, so nothing is silently swallowed. */
function attempt(run) {
    try {
        return { ok: true, value: run() };
    } catch (error) {
        return { error, ok: false };
    }
}

function describeError(error) {
    if (error instanceof Error) return `${error.constructor.name}: ${error.message.split('\n')[0]}`;
    return `non-Error thrown: ${String(error)}`;
}

function replacer(_key, value) {
    if (value instanceof Uint8Array) return `0x${hex(value)}`;
    if (typeof value === 'bigint') return value.toString();
    return value;
}

// ---------------------------------------------------------------------------------------------------------------
// write: the Option shape design.md 4.3's parseWrite depends on

function probeWriteRoundTrip() {
    claim('design.md 4.3: getWriteInstructionDataDecoder() yields offset:u32 and data:Option<bytes>');
    const chunk = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const encoded = getWriteInstructionDataEncoder().encode({ data: some(chunk), offset: 0x01020304 });
    const decoded = getWriteInstructionDataDecoder().decode(encoded);
    const inline = unwrapOption(decoded.data);
    actual(
        `encoded ${encoded.length} bytes ${hex(encoded)} -> disc=${decoded.discriminator} offset=${decoded.offset} ` +
            `data=${inline ? hex(inline) : 'None'}`,
        decoded.offset === 0x01020304 && inline != null && hex(inline) === hex(chunk),
    );
    note(
        'offset is a little-endian u32 at bytes [1..5) and data is a REMAINDER option: no tag, no length prefix, ' +
            'just the trailing bytes, so a write ix with no inline data is exactly 5 bytes',
    );

    claim("design.md 4.3's parseWrite tests `inline === undefined` for an absent Option");
    const noneEncoded = getWriteInstructionDataEncoder().encode({ data: none(), offset: 8 });
    const absent = unwrapOption(getWriteInstructionDataDecoder().decode(noneEncoded).data);
    actual(
        `unwrapOption(None) returns ${absent === undefined ? 'undefined' : JSON.stringify(absent)}, so ` +
            `\`inline === undefined\` evaluates to ${String(absent === undefined)}`,
        absent === undefined,
    );
    note(
        "design.md 4.3's snippet computes fromSourceBuffer === false for EVERY write, so the sourceBuffer shape is " +
            'never detected and an undefined chunk can be patched. The test must be `inline === null`, or ' +
            'unwrapOption(data, () => undefined), or kit`s isNone. The same idiom appears at design.md 388 and 458.',
    );

    claim('design.md 4.3 treats an empty inline data as a state distinct from an absent one');
    const emptySome = getWriteInstructionDataEncoder().encode({ data: some(new Uint8Array(0)), offset: 8 });
    const unwrapped = unwrapOption(getWriteInstructionDataDecoder().decode(emptySome).data);
    actual(
        `data:some(empty) encodes to ${emptySome.length} bytes ${hex(emptySome)} and decodes as ` +
            `${unwrapped == null ? 'None' : `Some(len ${unwrapped.length})`}`,
        unwrapped != null && unwrapped.length === 0,
    );
    note(
        'a remainder option cannot represent an EMPTY Some, so some(empty) and none() are the same 5 bytes. The ' +
            'replay therefore cannot tell a sourceBuffer write from a zero-length inline write by the Option alone ' +
            'and MUST look at account index 2, which is load-bearing rather than belt and braces',
    );
}

// ---------------------------------------------------------------------------------------------------------------
// setData: the three on-chain wire shapes

function probeSetDataLengthBranch() {
    claim(
        'design.md 1 and 3: getSetDataInstructionDataDecoder() THROWS on the 4-byte header-only setData, and works ' +
            'on the 5-byte foreign-buffer and 5+N inline shapes',
    );
    const fourByte = new Uint8Array([3, Encoding.Base64, Compression.Zlib, Format.Json]);
    const four = attempt(() => getSetDataInstructionDataDecoder().decode(fourByte));
    actual(
        `4 bytes ${hex(fourByte)} -> ${four.ok ? `NO THROW, ${JSON.stringify(four.value, replacer)}` : describeError(four.error)}`,
        !four.ok,
    );

    const fiveByte = new Uint8Array([3, Encoding.Base64, Compression.Zlib, Format.Json, DataSource.Direct]);
    const five = attempt(() => getSetDataInstructionDataDecoder().decode(fiveByte));
    actual(
        `5 bytes ${hex(fiveByte)} -> ${five.ok ? JSON.stringify(five.value, replacer) : describeError(five.error)}`,
        five.ok,
    );

    const inline = getSetDataInstructionDataEncoder().encode({
        compression: Compression.None,
        data: some(new Uint8Array([0x7b, 0x7d])),
        dataSource: DataSource.Direct,
        encoding: Encoding.Utf8,
        format: Format.Json,
    });
    const fivePlusN = attempt(() => getSetDataInstructionDataDecoder().decode(inline));
    actual(
        `5+N (${inline.length} bytes ${hex(inline)}) -> ` +
            `${fivePlusN.ok ? JSON.stringify(fivePlusN.value, replacer) : describeError(fivePlusN.error)}`,
        fivePlusN.ok,
    );
    note(
        'the inline shape is exactly 5 + N bytes, matching the three on-chain shapes design.md 1 enumerates, so the ' +
            'length branch in design.md 3 is the only guard needed',
    );

    claim('design.md 4.1 implies the 4-byte header-only shape is reachable in practice');
    const encoderWithoutDataSource = attempt(() =>
        getSetDataInstructionDataEncoder().encode({
            compression: Compression.None,
            encoding: Encoding.Utf8,
            format: Format.Json,
        }),
    );
    actual(
        `the generated ENCODER with no dataSource -> ` +
            `${encoderWithoutDataSource.ok ? `${encoderWithoutDataSource.value.length} bytes` : describeError(encoderWithoutDataSource.error)}`,
        !encoderWithoutDataSource.ok,
    );
    note(
        'the official TS client cannot BUILD a 4-byte setData, so that shape only ever comes from the Rust CLI or a ' +
            'hand-rolled instruction. The guard is still worth one line, but it is defensive, not a common path',
    );
}

// ---------------------------------------------------------------------------------------------------------------
// initialize: the in-place shape

function probeInitializeEmptyData() {
    claim('design.md 4.1: an initialize with empty trailing data means in-place, and its decoder always applies');
    const encoded = getInitializeInstructionDataEncoder().encode({
        compression: Compression.None,
        data: none(),
        dataSource: DataSource.Direct,
        encoding: Encoding.Utf8,
        format: Format.Json,
        seed: 'idl',
    });
    const inline = unwrapOption(getInitializeInstructionDataDecoder().decode(encoded).data);
    actual(
        `encoded ${encoded.length} bytes, data comes back as ${inline == null ? 'None' : `Some(len ${inline.length})`}`,
        inline == null,
    );
    note(
        `the installed encoder produced ${encoded.length} bytes: ${hex(encoded)}. design.md 1's "Initialize::LEN == ` +
            '20" is the Rust struct WITHOUT the discriminator (16 seed + 4 hint bytes), so the wire shape is 21. An ' +
            'implementer who invents a `length > 20 means has payload` test off that number is off by one',
    );

    // The on-chain shape is disc + seed(16) + 3 hint bytes + dataSource, with no Option tag and no length prefix.
    const onChain = new Uint8Array(21);
    onChain[0] = 1;
    onChain.set(new TextEncoder().encode('idl'), 1);
    onChain[17] = Encoding.Utf8;
    onChain[18] = Compression.None;
    onChain[19] = Format.Json;
    onChain[20] = DataSource.Direct;
    const raw = attempt(() => getInitializeInstructionDataDecoder().decode(onChain));
    actual(
        `a hand-built 21-byte on-chain initialize -> ` +
            `${raw.ok ? `decoded, data=${unwrapOption(raw.value.data) == null ? 'None' : 'Some'}` : describeError(raw.error)}`,
        raw.ok,
    );

    const twentyByte = attempt(() => getInitializeInstructionDataDecoder().decode(onChain.slice(0, 20)));
    actual(`a 20-byte initialize -> ${twentyByte.ok ? 'decoded' : describeError(twentyByte.error)}`, !twentyByte.ok);
}

// ---------------------------------------------------------------------------------------------------------------
// ExternalData: the P3 pointer

function probeExternalData() {
    claim('design.md 5: ExternalData is exactly 40 bytes and an all-zeroes length decodes as absent, not as empty');
    const encoded = getExternalDataEncoder().encode({ address: ZERO_ADDRESS, length: none(), offset: 0 });
    const decoded = getExternalDataDecoder().decode(encoded);
    const length = unwrapOption(decoded.length);
    actual(
        `encoded ${encoded.length} bytes ${hex(encoded)} -> offset=${decoded.offset} length=${length == null ? 'None' : length}`,
        encoded.length === 40 && length == null,
    );

    const unpacked = attempt(() => unpackExternalData(new Uint8Array(40)));
    actual(
        `unpackExternalData(40 zero bytes) -> ${unpacked.ok ? JSON.stringify(unpacked.value) : describeError(unpacked.error)}`,
        unpacked.ok && unpacked.value.length === undefined,
    );
    note(
        'unpackExternalData also collapses offset 0 to undefined, so the caller must default the dataSlice offset ' +
            'to 0 rather than treating an absent offset as an error. design.md 5 does not say which',
    );

    const withZeroLength = unpackExternalData(
        getExternalDataEncoder().encode({ address: ZERO_ADDRESS, length: some(0), offset: 4 }),
    );
    actual(`length: some(0) round-trips as ${JSON.stringify(withZeroLength)}`, withZeroLength.length === undefined);
    note('some(0) is indistinguishable from none(), so an explicit zero-length slice cannot be expressed on the wire');
}

// ---------------------------------------------------------------------------------------------------------------
// enums, discriminators, and the reusable encoding step

function probeEnumsAndDiscriminators() {
    claim(
        'design.md 2: Encoding None/Utf8/Base58/Base64 = 0/1/2/3, Compression None/Gzip/Zlib = 0/1/2, ' +
            'Format None/Json/Yaml/Toml = 0/1/2/3, DataSource Direct/Url/External = 0/1/2',
    );
    actual(
        `Encoding ${Encoding.None}/${Encoding.Utf8}/${Encoding.Base58}/${Encoding.Base64} | ` +
            `Compression ${Compression.None}/${Compression.Gzip}/${Compression.Zlib} | ` +
            `Format ${Format.None}/${Format.Json}/${Format.Yaml}/${Format.Toml} | ` +
            `DataSource ${DataSource.Direct}/${DataSource.Url}/${DataSource.External}`,
        Encoding.None === 0 &&
            Encoding.Utf8 === 1 &&
            Encoding.Base58 === 2 &&
            Encoding.Base64 === 3 &&
            Compression.None === 0 &&
            Compression.Gzip === 1 &&
            Compression.Zlib === 2 &&
            Format.None === 0 &&
            Format.Json === 1 &&
            Format.Yaml === 2 &&
            Format.Toml === 3 &&
            DataSource.Direct === 0 &&
            DataSource.Url === 1 &&
            DataSource.External === 2,
    );

    claim('design.md 1: discriminators write=0 initialize=1 setData=3 close=6 allocate=7 extend=8');
    const discriminators = {
        allocate: getAllocateDiscriminatorBytes()[0],
        close: getCloseDiscriminatorBytes()[0],
        extend: getExtendDiscriminatorBytes()[0],
        initialize: getInitializeDiscriminatorBytes()[0],
        setData: getSetDataDiscriminatorBytes()[0],
        write: getWriteDiscriminatorBytes()[0],
    };
    actual(
        JSON.stringify(discriminators),
        discriminators.write === 0 &&
            discriminators.initialize === 1 &&
            discriminators.setData === 3 &&
            discriminators.close === 6 &&
            discriminators.allocate === 7 &&
            discriminators.extend === 8,
    );

    claim('design.md 2: decodeData is exported and usable as the encoding step after a self-owned bounded inflate');
    const roundTrip = attempt(() => decodeData(new TextEncoder().encode('{"a":1}'), Encoding.Utf8));
    actual(
        `decodeData(utf8 bytes, Encoding.Utf8) -> ${roundTrip.ok ? JSON.stringify(roundTrip.value) : describeError(roundTrip.error)}`,
        roundTrip.ok,
    );
}

// ---------------------------------------------------------------------------------------------------------------
// pako: only the parts run.mjs section 5 does not cover

class PayloadTooLargeError extends Error {}

/** design.md 3's boundedUncompress, instrumented, with the throw caught so the probe can see how far pako got. */
function inflateUpToCap(data, cap) {
    const inflator = new pako.Inflate({ chunkSize: 16 * 1024, windowBits: 47 });
    let onDataCalls = 0;
    let total = 0;
    inflator.onData = chunk => {
        onDataCalls += 1;
        total += chunk.length;
        if (total > cap) throw new PayloadTooLargeError(`inflated past ${cap} bytes`);
        inflator.chunks.push(chunk);
    };
    try {
        inflator.push(data, true);
    } catch (error) {
        if (!(error instanceof PayloadTooLargeError)) throw error;
    }
    return { chunks: inflator.chunks.length, onDataCalls, result: inflator.result, total };
}

function probePako() {
    const compressed = pako.deflate(new Uint8Array(1024 * 1024).fill(0x41));

    claim('design.md 3: chunkSize bounds how far past the cap a capped inflate can get');
    const uncapped = inflateUpToCap(compressed, Number.MAX_SAFE_INTEGER);
    const capped = inflateUpToCap(compressed, 32 * 1024);
    actual(
        `uncapped emitted ${uncapped.total} bytes in ${uncapped.onDataCalls} onData calls, capped at 32768 stopped ` +
            `at ${capped.total} bytes in ${capped.onDataCalls} call(s)`,
        capped.onDataCalls < uncapped.onDataCalls && capped.total <= 32 * 1024 + 16 * 1024,
    );

    claim('design.md 3: on the throw path the caller can still read inflator.result');
    actual(
        `after the cap throw, inflator.result is ${capped.result === undefined ? 'undefined' : `a ${capped.result.constructor.name} of length ${capped.result.length}`} ` +
            `while chunks still holds ${capped.chunks} chunk(s)`,
        capped.result !== undefined,
    );
    note(
        'the catch path must NOT read result. src/inflate.mjs sidesteps this by accumulating into its own array ' +
            'instead of pako internals, which is the shape the implementation should copy',
    );

    claim("design.md 3: pako defaults chunkSize to 64 KB, and its own docstring's 16 KB is stale");
    const chunkSize = new pako.Inflate({ windowBits: 47 }).options.chunkSize;
    actual(`new pako.Inflate({windowBits:47}).options.chunkSize == ${chunkSize}`, chunkSize === 65536);

    claim("design.md 3's snippet does `inflator.chunks.push(chunk)`, so @types/pako must declare `chunks`");
    actual(
        `chunks and options exist at runtime: ${'chunks' in new pako.Inflate({})}. Against @types/pako tsc reports ` +
            "TS2339 Property 'chunks' does not exist on type 'Inflate'",
        false,
    );
    note(
        'neither `chunks` nor `options` is declared, so design.md 3s snippet does not compile as written. The real ' +
            'implementation needs a widening type or, better, its own accumulator as in src/inflate.mjs',
    );
}

// ---------------------------------------------------------------------------------------------------------------

process.stdout.write('PROTOTYPE probe: what the INSTALLED libraries do, versus what design.md claims\n');
probeWriteRoundTrip();
probeSetDataLengthBranch();
probeInitializeEmptyData();
probeExternalData();
probeEnumsAndDiscriminators();
probePako();
process.stdout.write(`\n${differs === 0 ? GREEN : RED}${differs} assumption(s) differ from design.md${RESET}\n`);
