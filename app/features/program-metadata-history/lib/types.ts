import { type ProgramMetadataInstruction } from '@solana-program/program-metadata';

export { ProgramMetadataInstruction as InstructionType } from '@solana-program/program-metadata';

export enum AccountStatus {
    NonExistent = 'non-existent',
    Buffer = 'buffer',
    Active = 'active',
    Closed = 'closed',
}

export interface MetadataEvent {
    signature: string;
    slot: number;
    blockTime: number | undefined;
    instructionType: ProgramMetadataInstruction;
    failed: boolean;
    /** Data written in this instruction (for Write/Initialize/SetData with inline data) */
    dataLength?: number;
    /** Byte offset for Write instructions */
    writeOffset?: number;
    /** Raw inline bytes from Write/Initialize/SetData instructions */
    rawData?: Uint8Array;
    /** New authority address for SetAuthority */
    newAuthority?: string;
    /** Encoding value from Initialize/SetData */
    encoding?: number;
    /** Compression value from Initialize/SetData */
    compression?: number;
    /** Format value from Initialize/SetData */
    format?: number;
    /** Data source value from Initialize/SetData */
    dataSource?: number;
}

export interface Snapshot {
    event: MetadataEvent;
    state: VirtualState;
}

export interface VirtualState {
    status: AccountStatus;
    dataSize: number;
    encoding: number;
    compression: number;
    format: number;
    dataSource: number;
    authority: string | undefined;
    mutable: boolean;
    canonical: boolean;
    /** Running tally of bytes written to the buffer */
    bufferBytesWritten: number;
    /** Raw buffer bytes being accumulated via Write instructions */
    bufferData: Uint8Array;
    /** Decoded content string at this point in time (after Initialize/SetData) */
    content: string | undefined;
}
