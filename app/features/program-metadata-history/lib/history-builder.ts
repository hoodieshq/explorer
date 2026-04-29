import { type HistoryBuilder, tryPrettyJson } from '@entities/account-history';
import {
    Compression,
    DataSource,
    decodeData,
    Encoding,
    Format,
    uncompressData,
} from '@solana-program/program-metadata';

import { parseMetadataTransaction } from './parse-metadata-instruction';
import { AccountStatus, InstructionType, type MetadataEvent, type MetadataState } from './types';

export function createMetadataHistoryBuilder(): HistoryBuilder<MetadataEvent, MetadataState> {
    return {
        applyEvent,
        initialState: createEmptyState(),
        parseTransaction: parseMetadataTransaction,
        // Drop the live byte buffer from each emitted snapshot to keep the snapshot list small.
        snapshotState: state => ({ ...state, bufferData: new Uint8Array(0) }),
    };
}

function createEmptyState(): MetadataState {
    return {
        authority: undefined,
        bufferBytesWritten: 0,
        bufferData: new Uint8Array(0),
        canonical: false,
        compression: Compression.None,
        content: undefined,
        dataSize: 0,
        dataSource: DataSource.Direct,
        encoding: Encoding.None,
        format: Format.None,
        mutable: true,
        status: AccountStatus.NonExistent,
    };
}

function applyEvent(prev: MetadataState, event: MetadataEvent): MetadataState {
    switch (event.instructionType) {
        // Allocate runs against an existing account that may already have an authority/mutable flag,
        // so we preserve `prev` and only reset buffer fields. Anchor's Create is genesis instead and
        // wipes everything.
        case InstructionType.Allocate:
            return {
                ...prev,
                bufferBytesWritten: 0,
                bufferData: new Uint8Array(0),
                status: AccountStatus.Pending,
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

function applyWrite(prev: MetadataState, event: MetadataEvent): MetadataState {
    const writeOffset = event.writeOffset ?? 0;
    const rawData = event.rawData;
    if (!rawData || rawData.length === 0) {
        // Empty Write still nudges status to Pending — a Write tx did execute and the account is
        // mid-flight, even if this particular call carried no bytes. Anchor's equivalent path
        // returns prev unchanged because Anchor Writes always carry data; an empty one is malformed
        // and we leave state alone.
        return { ...prev, status: AccountStatus.Pending };
    }

    const requiredSize = writeOffset + rawData.length;

    let bufferData: Uint8Array;
    if (requiredSize > prev.bufferData.length) {
        bufferData = new Uint8Array(requiredSize);
        bufferData.set(prev.bufferData);
    } else {
        bufferData = new Uint8Array(prev.bufferData);
    }

    bufferData.set(rawData, writeOffset);

    return {
        ...prev,
        bufferBytesWritten: prev.bufferBytesWritten + rawData.length,
        bufferData,
        status: AccountStatus.Pending,
    };
}

function applyInitializeOrSetData(prev: MetadataState, event: MetadataEvent, isInitialize: boolean): MetadataState {
    const encoding = event.encoding ?? prev.encoding;
    const compression = event.compression ?? prev.compression;
    const format = event.format ?? prev.format;
    const dataSource = event.dataSource ?? prev.dataSource;

    // Raw data is either inline on the instruction or accumulated through prior Write calls.
    const rawData = event.rawData ?? (prev.bufferBytesWritten > 0 ? prev.bufferData : undefined);
    const dataSize = rawData?.length ?? event.dataLength ?? prev.bufferBytesWritten;

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

function tryDecodeContent(data: Uint8Array, compression: Compression, encoding: Encoding): string | undefined {
    try {
        const decompressed = uncompressData(data, compression);
        const decoded = decodeData(decompressed, encoding);
        return tryPrettyJson(decoded);
    } catch {
        // Buffer may be partial or use a codec we couldn't apply yet — surface "no content"
        // rather than throwing, since intermediate snapshots legitimately fail to decode.
        return undefined;
    }
}
