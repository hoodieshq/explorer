import type { HistoryEventBase, HistorySnapshot, HistoryStateBase } from './types';
import type { RawTransaction, TransactionResponse } from './walk-instructions';

export interface HistoryBuilder<E extends HistoryEventBase, S extends HistoryStateBase> {
    /** Pulls events out of a single confirmed transaction. `base` carries the pre-computed
     * common event fields (signature/slot/blockTime/failed) — spread it into each event. */
    parseTransaction(tx: TransactionResponse, base: HistoryEventBase): E[];
    /** Reduces a successful event into the next state. Failed events are skipped. */
    applyEvent(state: S, event: E): S;
    /** Optional projection applied to each emitted snapshot — handy for dropping in-flight buffers. */
    snapshotState?(state: S): S;
    /** Optional filter to drop events from the snapshot timeline (state still advances). */
    shouldSnapshot?(event: E): boolean;
    initialState: S;
}

/**
 * Pure transformation: parse each raw transaction into events and replay them
 * into a chronological snapshot list. No I/O — ideal for tests and alternative
 * data sources (cache, fixtures).
 */
export function buildHistory<E extends HistoryEventBase, S extends HistoryStateBase>(
    transactions: RawTransaction[],
    builder: HistoryBuilder<E, S>,
): HistorySnapshot<E, S>[] {
    const events: E[] = [];
    for (const { info, transaction } of transactions) {
        events.push(
            ...builder.parseTransaction(transaction, {
                blockTime: info.blockTime !== null ? Number(info.blockTime) : undefined,
                failed: info.err !== null && info.err !== undefined,
                signature: info.signature,
                slot: Number(info.slot),
            }),
        );
    }

    let state = builder.initialState;
    const project = builder.snapshotState ?? (s => s);
    const shouldSnapshot = builder.shouldSnapshot ?? (() => true);

    const snapshots: HistorySnapshot<E, S>[] = [];
    for (const event of events) {
        if (!event.failed) state = builder.applyEvent(state, event);
        if (shouldSnapshot(event)) snapshots.push({ event, state: project(state) });
    }
    return snapshots;
}
