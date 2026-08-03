import {
    Compression,
    DataSource,
    Encoding,
    Format,
    PROGRAM_METADATA_PROGRAM_ADDRESS,
} from '@solana-program/program-metadata';

/** The PMP program id, re-exported from the library so the guard cannot drift from the decoders. */
export const PMP_ADDRESS: string = PROGRAM_METADATA_PROGRAM_ADDRESS;

/**
 * Program label for the card title and the Program row, matching what `CodamaInstructionCard` derives from the
 * IDL for the six housekeeping instructions: the rootNode program name `programMetadata` with its first letter
 * upper-cased. Deliberately NOT the registry name `PROGRAM_NAMES.PROGRAM_METADATA` ('Program Metadata Program'),
 * so a transaction carrying both a `setData` and an `allocate` labels both cards identically.
 */
export const PMP_CODAMA_PROGRAM_NAME = 'ProgramMetadata';

/**
 * Render cap for decoded content, per the p1 spec. Above it the card renders a bounded raw view plus a
 * download affordance instead of the full document. Measured on the DECOMPRESSED payload bytes, so an
 * oversized payload is never handed to `decodeData` or `JSON.parse` at all.
 */
export const PMP_DECODED_RENDER_CAP_BYTES = 256 * 1024;

/**
 * Depth at which the decoded JSON tree starts collapsed. `@microlink/react-json-view` is not virtualized and the
 * common payload is a program IDL, so an expanded root would render thousands of nodes. The IDL page collapses
 * for the same reason.
 */
export const PMP_JSON_COLLAPSE_DEPTH = 1;

/** Download base names. `DownloadDropdown` appends `_<encoding>.txt`, so no extension belongs here. */
export const PMP_RAW_DOWNLOAD_FILENAME = 'pmp-payload-raw';
export const PMP_DECODED_DOWNLOAD_FILENAME = 'pmp-payload-decoded';
export const PMP_WRITE_CHUNK_DOWNLOAD_FILENAME = 'pmp-write-chunk';

/** setData carries `dataSource` as an optional trailing byte, so 4 bytes is the header-only hint-update shape. */
export const HEADER_ONLY_SET_DATA_LEN = 4;

/** setData's optional `buffer` and write's optional `sourceBuffer` both sit at account index 2. */
export const PMP_OPTIONAL_BUFFER_ACCOUNT_INDEX = 2;

// Explicit label maps rather than the numeric enums' reverse mapping: a new library variant then breaks the
// build here instead of rendering `undefined` in the card.
export const PMP_ENCODING_LABELS: Record<Encoding, string> = {
    [Encoding.Base58]: 'Base58',
    [Encoding.Base64]: 'Base64',
    [Encoding.None]: 'None (hex)',
    [Encoding.Utf8]: 'UTF-8',
};

export const PMP_COMPRESSION_LABELS: Record<Compression, string> = {
    [Compression.Gzip]: 'Gzip',
    [Compression.None]: 'None',
    [Compression.Zlib]: 'Zlib',
};

export const PMP_FORMAT_LABELS: Record<Format, string> = {
    [Format.Json]: 'JSON',
    [Format.None]: 'None',
    [Format.Toml]: 'TOML',
    [Format.Yaml]: 'YAML',
};

export const PMP_DATA_SOURCE_LABELS: Record<DataSource, string> = {
    [DataSource.Direct]: 'Direct',
    [DataSource.External]: 'External',
    [DataSource.Url]: 'Url',
};

/** Lowercase GA param values, so the event vocabulary stays stable if the display labels change. */
export const PMP_FORMAT_ANALYTICS_NAMES: Record<Format, string> = {
    [Format.Json]: 'json',
    [Format.None]: 'none',
    [Format.Toml]: 'toml',
    [Format.Yaml]: 'yaml',
};

export const PMP_DATA_SOURCE_ANALYTICS_NAMES: Record<DataSource, string> = {
    [DataSource.Direct]: 'direct',
    [DataSource.External]: 'external',
    [DataSource.Url]: 'url',
};

export const PMP_ANALYTICS_IX_NAMES = {
    initialize: 'initialize',
    setData: 'set_data',
} as const;

/**
 * Instruction account order, verified against the generated client's `getXInstruction` builders (design 1).
 * These are FINAL row labels, rendered verbatim. They carry Codama's own capitalisation (first letter upper,
 * no word split) so a `setData` card labels its accounts exactly like the `allocate` card next to it, which
 * `CodamaInstructionCard` builds with `charAt(0).toUpperCase() + slice(1)`.
 */
export const PMP_ACCOUNT_NAMES = {
    initialize: ['Metadata', 'Authority', 'Program', 'ProgramData', 'System'],
    setData: ['Metadata', 'Authority', 'Buffer', 'Program', 'ProgramData'],
    write: ['Buffer', 'Authority', 'SourceBuffer'],
} as const;

/** Instruction labels in Codama's style (the IDL name with its first letter upper-cased), for the same reason. */
export const PMP_IX_TITLES = {
    initialize: 'Initialize',
    setData: 'SetData',
    write: 'Write',
} as const;
