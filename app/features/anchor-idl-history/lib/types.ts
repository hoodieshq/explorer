import type { HistoryEventBase, HistorySnapshot, HistoryStateBase } from '@entities/account-history';

export { AccountStatus } from '@entities/account-history';

export enum InstructionType {
    Create = 'Create',
    Resize = 'Resize',
    Close = 'Close',
    CreateBuffer = 'CreateBuffer',
    Write = 'Write',
    SetAuthority = 'SetAuthority',
    SetBuffer = 'SetBuffer',
}

export interface AnchorIdlEvent extends HistoryEventBase {
    instructionType: InstructionType;
    /** Length of bytes appended by Write — wire-friendly mirror of rawData.length. */
    dataLength?: number;
    /** Bytes appended by Write — kept on the client; stripped before JSON serialization on the API route. */
    rawData?: Uint8Array;
    /** Authority pubkey from SetAuthority */
    newAuthority?: string;
    /** Resized data length from Create / Resize */
    dataLen?: number;
    /** Source buffer account address from SetBuffer (`accounts[0]` per Anchor's IdlSetBuffer context). */
    bufferAccount?: string;
}

export interface AnchorIdlState extends HistoryStateBase {
    authority: string | undefined;
    mutable: boolean;
    /** Concatenated zlib-compressed IDL bytes accumulated by Write */
    bufferData: Uint8Array;
}

export type Snapshot = HistorySnapshot<AnchorIdlEvent, AnchorIdlState>;
