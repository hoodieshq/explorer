export enum AccountStatus {
    NonExistent = 'non-existent',
    Pending = 'pending',
    Active = 'active',
    Closed = 'closed',
}

export interface HistoryEventBase {
    signature: string;
    slot: number;
    blockTime: number | undefined;
    failed: boolean;
}

export interface HistoryStateBase {
    status: AccountStatus;
    dataSize: number;
    content: string | undefined;
}

export interface HistorySnapshot<E extends HistoryEventBase, S extends HistoryStateBase> {
    event: E;
    state: S;
}

export interface History<E extends HistoryEventBase, S extends HistoryStateBase> {
    snapshots: HistorySnapshot<E, S>[];
    totalSignatures: number;
    /** True if `HISTORY_LIMIT` was hit and older signatures may have been dropped. */
    truncated: boolean;
}
