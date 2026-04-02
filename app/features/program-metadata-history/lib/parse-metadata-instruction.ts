import { type Option, type ReadonlyUint8Array } from '@solana/kit';
import {
    getInitializeInstructionDataDecoder,
    getSetDataInstructionDataDecoder,
    getWriteInstructionDataDecoder,
    identifyProgramMetadataInstruction,
    ProgramMetadataInstruction,
} from '@solana-program/program-metadata';
import bs58 from 'bs58';

import { PROGRAM_METADATA_PROGRAM_ID } from './constants';
import { InstructionType, type MetadataEvent } from './types';

interface ParsedTransactionInstruction {
    programId: string;
    data: string; // base58-encoded
    accounts: string[];
}

interface TransactionInfo {
    signature: string;
    slot: number;
    blockTime: number | undefined;
    err: unknown;
    instructions: ParsedTransactionInstruction[];
}

const writeDecoder = getWriteInstructionDataDecoder();
const initializeDecoder = getInitializeInstructionDataDecoder();
const setDataDecoder = getSetDataInstructionDataDecoder();

/**
 * Parse a raw transaction (from web3.js getTransaction) into MetadataEvents.
 * Scans both outer and inner instructions for the program-metadata program.
 */
export function parseMetadataTransaction(tx: TransactionInfo): MetadataEvent[] {
    const events: MetadataEvent[] = [];

    for (const ix of tx.instructions) {
        if (ix.programId !== PROGRAM_METADATA_PROGRAM_ID) continue;

        const dataBytes = bs58.decode(ix.data);
        if (dataBytes.length === 0) continue;

        const event = buildEvent(tx, dataBytes, ix.accounts);
        if (event) {
            events.push(event);
        }
    }

    return events;
}

function buildEvent(tx: TransactionInfo, dataBytes: Uint8Array, accounts: string[]): MetadataEvent | undefined {
    let instructionType: ProgramMetadataInstruction;
    try {
        instructionType = identifyProgramMetadataInstruction(dataBytes);
    } catch {
        return undefined;
    }

    const base: MetadataEvent = {
        blockTime: tx.blockTime ?? undefined,
        failed: tx.err !== undefined && tx.err !== null,
        instructionType: instructionType satisfies InstructionType,
        signature: tx.signature,
        slot: tx.slot,
    };

    switch (instructionType) {
        case ProgramMetadataInstruction.Write:
            return parseWrite(base, dataBytes);
        case ProgramMetadataInstruction.Initialize:
            return parseInitialize(base, dataBytes);
        case ProgramMetadataInstruction.SetData:
            return parseSetData(base, dataBytes);
        case ProgramMetadataInstruction.SetAuthority:
            return { ...base, newAuthority: accounts[2] };
        default:
            return base;
    }
}

function parseWrite(base: MetadataEvent, dataBytes: Uint8Array): MetadataEvent {
    const decoded = writeDecoder.decode(dataBytes);
    const rawData = unwrapOptionBytes(decoded.data);

    return {
        ...base,
        dataLength: rawData?.length,
        rawData,
        writeOffset: decoded.offset,
    };
}

function parseInitialize(base: MetadataEvent, dataBytes: Uint8Array): MetadataEvent {
    const decoded = initializeDecoder.decode(dataBytes);
    const rawData = unwrapOptionBytes(decoded.data);

    return {
        ...base,
        compression: decoded.compression,
        dataLength: rawData?.length,
        dataSource: decoded.dataSource,
        encoding: decoded.encoding,
        format: decoded.format,
        rawData,
    };
}

function parseSetData(base: MetadataEvent, dataBytes: Uint8Array): MetadataEvent {
    const decoded = setDataDecoder.decode(dataBytes);
    const rawData = unwrapOptionBytes(decoded.data);

    return {
        ...base,
        compression: decoded.compression,
        dataLength: rawData?.length,
        dataSource: decoded.dataSource,
        encoding: decoded.encoding,
        format: decoded.format,
        rawData,
    };
}

/** Extract bytes from a @solana/kit Option<ReadonlyUint8Array>, returning undefined for None. */
function unwrapOptionBytes(option: Option<ReadonlyUint8Array>): Uint8Array | undefined {
    if (option.__option === 'None') return undefined;
    // Runtime shape is { __option: 'Some', value: ReadonlyUint8Array }
    const some = option as unknown as { __option: 'Some'; value: ReadonlyUint8Array };
    return new Uint8Array(some.value);
}
