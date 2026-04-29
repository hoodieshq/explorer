import { type HistoryEventBase, type TransactionResponse, walkInstructions } from '@entities/account-history';
import { isSome, type Option, type ReadonlyUint8Array } from '@solana/kit';
import {
    getInitializeInstructionDataDecoder,
    getSetDataInstructionDataDecoder,
    getWriteInstructionDataDecoder,
    identifyProgramMetadataInstruction,
    PROGRAM_METADATA_PROGRAM_ADDRESS,
    ProgramMetadataInstruction,
} from '@solana-program/program-metadata';

import { type MetadataEvent } from './types';

const writeDecoder = getWriteInstructionDataDecoder();
const initializeDecoder = getInitializeInstructionDataDecoder();
const setDataDecoder = getSetDataInstructionDataDecoder();

/**
 * Parse a kit `getTransaction` response into MetadataEvents. Scans both outer
 * and inner instructions for the program-metadata program.
 */
export function parseMetadataTransaction(tx: TransactionResponse, base: HistoryEventBase): MetadataEvent[] {
    const events: MetadataEvent[] = [];
    for (const ix of walkInstructions(tx, PROGRAM_METADATA_PROGRAM_ADDRESS)) {
        if (ix.data.length === 0) continue;
        const event = buildEvent(base, ix.data, ix.accounts);
        if (event) events.push(event);
    }
    return events;
}

function buildEvent(
    base: HistoryEventBase,
    dataBytes: Uint8Array,
    accounts: readonly string[],
): MetadataEvent | undefined {
    let instructionType: ProgramMetadataInstruction;
    try {
        instructionType = identifyProgramMetadataInstruction(dataBytes);
    } catch {
        return undefined;
    }

    const event: MetadataEvent = { ...base, instructionType };

    switch (instructionType) {
        case ProgramMetadataInstruction.Write:
            return parseWrite(event, dataBytes);
        case ProgramMetadataInstruction.Initialize:
            return parseInitialize(event, dataBytes);
        case ProgramMetadataInstruction.SetData:
            return parseSetData(event, dataBytes);
        case ProgramMetadataInstruction.SetAuthority:
            return { ...event, newAuthority: accounts[2] };
        default:
            return event;
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

function unwrapOptionBytes(option: Option<ReadonlyUint8Array>): Uint8Array | undefined {
    return isSome(option) ? new Uint8Array(option.value) : undefined;
}
