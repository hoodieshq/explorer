// Instruction-shape decoding over the REAL @solana-program/program-metadata decoders.
// Verifies design.md §3 (4-byte setData guard) and §4.3 (write chunk parsing) against the installed library.

import {
    getInitializeInstructionDataDecoder,
    getSetDataInstructionDataDecoder,
    getWriteInstructionDataDecoder,
    ProgramMetadataInstruction,
} from '@solana-program/program-metadata';

export const PMP_PROGRAM_ID = 'ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S';
export const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
export const HEADER_LEN = 96;

// Rent: minimum = (ACCOUNT_STORAGE_OVERHEAD + size) * lamports_per_byte_year * exemption_threshold.
export const RENT_OVERHEAD_BYTES = 128;
export const RENT_LAMPORTS_PER_BYTE = 3480 * 2;

const unwrap = option => (option && option.__option === 'Some' ? option.value : undefined);

/**
 * setData config decode. The dataSource byte is optional on the wire, so a 4-byte header-only setData has no
 * dataSource and the generated decoder throws on it ("Codec [u8] cannot decode empty byte arrays").
 * Branch on the length BEFORE calling the decoder.
 */
export function decodeSetDataConfig(ixData) {
    if (ixData.length === 4) {
        const [, encoding, compression, format] = ixData;
        return { compression, data: undefined, dataSource: undefined, encoding, format, headerOnly: true };
    }
    const decoded = getSetDataInstructionDataDecoder().decode(ixData);
    return {
        compression: decoded.compression,
        data: unwrap(decoded.data),
        dataSource: decoded.dataSource,
        encoding: decoded.encoding,
        format: decoded.format,
        headerOnly: false,
    };
}

export function decodeInitializeConfig(ixData) {
    const decoded = getInitializeInstructionDataDecoder().decode(ixData);
    return {
        compression: decoded.compression,
        data: unwrap(decoded.data),
        dataSource: decoded.dataSource,
        encoding: decoded.encoding,
        format: decoded.format,
        headerOnly: false,
        seed: decoded.seed,
    };
}

/**
 * write chunk. Empty inline data plus a sourceBuffer at account index 2 means the bytes were copied from another
 * account and are NOT in this transaction, so replay cannot recover them.
 */
export function parseWrite(ix) {
    const { data, offset } = getWriteInstructionDataDecoder().decode(ix.data);
    const inline = unwrap(data);
    const sourceBuffer = ix.accounts[2];
    return {
        data: inline,
        fromSourceBuffer: inline === undefined && sourceBuffer !== undefined && sourceBuffer !== PMP_PROGRAM_ID,
        offset,
        sourceBuffer,
    };
}

export const DISCRIMINATOR = ProgramMetadataInstruction;
