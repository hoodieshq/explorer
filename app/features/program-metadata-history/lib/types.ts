import type { HistoryEventBase, HistorySnapshot, HistoryStateBase } from '@entities/account-history';
import {
    type Compression,
    type DataSource,
    type Encoding,
    type Format,
    type ProgramMetadataInstruction,
} from '@solana-program/program-metadata';

export { AccountStatus } from '@entities/account-history';
export { ProgramMetadataInstruction as InstructionType } from '@solana-program/program-metadata';

export interface MetadataEvent extends HistoryEventBase {
    instructionType: ProgramMetadataInstruction;
    /** Data written in this instruction (for Write/Initialize/SetData with inline data) */
    dataLength?: number;
    /** Byte offset for Write instructions */
    writeOffset?: number;
    /** Raw inline bytes from Write/Initialize/SetData instructions */
    rawData?: Uint8Array;
    /** New authority address for SetAuthority */
    newAuthority?: string;
    encoding?: Encoding;
    compression?: Compression;
    format?: Format;
    dataSource?: DataSource;
}

export interface MetadataState extends HistoryStateBase {
    encoding: Encoding;
    compression: Compression;
    format: Format;
    dataSource: DataSource;
    authority: string | undefined;
    mutable: boolean;
    canonical: boolean;
    /** Running tally of bytes written to the buffer */
    bufferBytesWritten: number;
    /** Raw buffer bytes being accumulated via Write instructions */
    bufferData: Uint8Array;
}

export type Snapshot = HistorySnapshot<MetadataEvent, MetadataState>;
