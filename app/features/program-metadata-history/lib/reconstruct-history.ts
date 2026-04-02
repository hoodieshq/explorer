import { type Compression, decodeData, type Encoding, uncompressData } from '@solana-program/program-metadata';

import { AccountStatus, InstructionType, type MetadataEvent, type Snapshot, type VirtualState } from './types';

export function reconstructHistory(events: MetadataEvent[]): Snapshot[] {
    let state = createEmptyState();
    const snapshots: Snapshot[] = [];

    for (const event of events) {
        if (!event.failed) {
            state = applyEvent(state, event);
        }
        // Snapshot copies state but drops bufferData to save memory in the snapshot list
        snapshots.push({
            event,
            state: { ...state, bufferData: new Uint8Array(0) },
        });
    }

    return snapshots;
}

function createEmptyState(): VirtualState {
    return {
        authority: undefined,
        bufferBytesWritten: 0,
        bufferData: new Uint8Array(0),
        canonical: false,
        compression: 0,
        content: undefined,
        dataSize: 0,
        dataSource: 0,
        encoding: 0,
        format: 0,
        mutable: true,
        status: AccountStatus.NonExistent,
    };
}

function applyEvent(prev: VirtualState, event: MetadataEvent): VirtualState {
    switch (event.instructionType) {
        case InstructionType.Allocate:
            return {
                ...prev,
                bufferBytesWritten: 0,
                bufferData: new Uint8Array(0),
                status: AccountStatus.Buffer,
            };

        case InstructionType.Write:
            return applyWrite(prev, event);

        case InstructionType.Initialize:
            return applyInitializeOrSetData(prev, event, true);

        case InstructionType.SetData:
            return applyInitializeOrSetData(prev, event, false);

        case InstructionType.SetAuthority:
            return { ...prev, authority: event.newAuthority };

        case InstructionType.SetImmutable:
            return { ...prev, mutable: false };

        case InstructionType.Close:
            return { ...createEmptyState(), status: AccountStatus.Closed };

        case InstructionType.Trim:
        case InstructionType.Extend:
            return prev;

        default:
            return prev;
    }
}

function applyWrite(prev: VirtualState, event: MetadataEvent): VirtualState {
    const writeOffset = event.writeOffset ?? 0;
    const rawData = event.rawData;
    if (!rawData || rawData.length === 0) {
        return { ...prev, status: AccountStatus.Buffer };
    }

    const requiredSize = writeOffset + rawData.length;

    // Grow buffer if needed
    let bufferData: Uint8Array;
    if (requiredSize > prev.bufferData.length) {
        bufferData = new Uint8Array(requiredSize);
        bufferData.set(prev.bufferData);
    } else {
        bufferData = new Uint8Array(prev.bufferData);
    }

    // Write the data at the offset
    bufferData.set(rawData, writeOffset);

    return {
        ...prev,
        bufferBytesWritten: prev.bufferBytesWritten + rawData.length,
        bufferData,
        status: AccountStatus.Buffer,
    };
}

function applyInitializeOrSetData(prev: VirtualState, event: MetadataEvent, isInitialize: boolean): VirtualState {
    const encoding = event.encoding ?? prev.encoding;
    const compression = event.compression ?? prev.compression;
    const format = event.format ?? prev.format;
    const dataSource = event.dataSource ?? prev.dataSource;

    // Determine the raw data: inline from the instruction, or from the accumulated buffer
    const rawData = event.rawData ?? (prev.bufferBytesWritten > 0 ? prev.bufferData : undefined);
    const dataSize = rawData?.length ?? event.dataLength ?? prev.bufferBytesWritten;

    // Try to decode the content
    const content = rawData ? tryDecodeContent(rawData, compression, encoding) : prev.content;

    return {
        ...prev,
        bufferBytesWritten: 0,
        bufferData: new Uint8Array(0),
        compression,
        content,
        dataSize,
        dataSource,
        encoding,
        format,
        mutable: isInitialize ? true : prev.mutable,
        status: AccountStatus.Active,
    };
}

function tryDecodeContent(data: Uint8Array, compression: number, encoding: number): string | undefined {
    try {
        const decompressed = uncompressData(data, compression as unknown as Compression);
        const decoded = decodeData(decompressed, encoding as unknown as Encoding);
        // Pretty-print JSON if possible
        try {
            return JSON.stringify(JSON.parse(decoded), undefined, 2);
        } catch {
            return decoded;
        }
    } catch {
        return undefined;
    }
}
