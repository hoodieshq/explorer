import {
    type HistoryBuilder,
    type HistoryEventBase,
    type RawTransaction,
    tryPrettyJson,
} from '@entities/account-history';
import { type Address } from '@solana/kit';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import { inflate } from 'pako';

import { parseAnchorIdlTransaction } from './parse-idl-instruction';
import { AccountStatus, type AnchorIdlEvent, type AnchorIdlState, InstructionType } from './types';

interface BuilderOptions {
    /**
     * Map from a SetBuffer transaction signature → bytes the foreign buffer account held when
     * consumed. Resolve by fetching each unique buffer's transactions and replaying its Writes
     * via `replayBufferWrites`. When a SetBuffer signature is in this map, reconstruction copies
     * the bytes onto the IDL account; otherwise content stays unknown for that snapshot.
     */
    bufferContents?: ReadonlyMap<string, Uint8Array>;
}

export function createAnchorIdlHistoryBuilder(
    programAddress: Address,
    options: BuilderOptions = {},
): HistoryBuilder<AnchorIdlEvent, AnchorIdlState> {
    const bufferContents = options.bufferContents;
    return {
        applyEvent: (prev, event) => applyEvent(prev, event, bufferContents),
        initialState: createEmptyState(),
        parseTransaction: (tx, base) => parseAnchorIdlTransaction(tx, base, programAddress),
        // Drop the live byte buffer from each emitted snapshot to keep the snapshot list small.
        snapshotState: state => ({ ...state, bufferData: new Uint8Array(0) }),
    };
}

/**
 * Replay just the Write events on a foreign buffer account to recover the bytes it held.
 * Used to bridge SetBuffer: the buffer account's Writes never appear in the IDL account's tx
 * list, so without this the IDL history would lose content at every SetBuffer.
 */
export function replayBufferWrites(transactions: RawTransaction[], programAddress: Address): Uint8Array {
    let buffer = new Uint8Array(0);
    for (const { info, transaction } of transactions) {
        if (info.err !== null && info.err !== undefined) continue;
        const base: HistoryEventBase = {
            blockTime: info.blockTime !== null ? Number(info.blockTime) : undefined,
            failed: false,
            signature: info.signature,
            slot: Number(info.slot),
        };
        for (const event of parseAnchorIdlTransaction(transaction, base, programAddress)) {
            if (event.instructionType !== InstructionType.Write) continue;
            if (!event.rawData || event.rawData.length === 0) continue;
            const next = new Uint8Array(buffer.length + event.rawData.length);
            next.set(buffer);
            next.set(event.rawData, buffer.length);
            buffer = next;
        }
    }
    return buffer;
}

function createEmptyState(): AnchorIdlState {
    return {
        authority: undefined,
        bufferData: new Uint8Array(0),
        content: undefined,
        dataSize: 0,
        mutable: true,
        status: AccountStatus.NonExistent,
    };
}

function applyEvent(
    prev: AnchorIdlState,
    event: AnchorIdlEvent,
    bufferContents: ReadonlyMap<string, Uint8Array> | undefined,
): AnchorIdlState {
    switch (event.instructionType) {
        // Create is genesis for an Anchor IDL account, so we wipe everything. PMP's Allocate is the
        // analogous step but runs against an existing account, so it preserves authority/mutable —
        // the two switches deliberately differ here.
        case InstructionType.Create:
            return { ...createEmptyState(), status: AccountStatus.Active };

        case InstructionType.Write:
            return applyWrite(prev, event);

        case InstructionType.SetAuthority:
            // Anchor's "make immutable" convention is to SetAuthority to the System Program address;
            // any other value is a real authority handover.
            return {
                ...prev,
                authority: event.newAuthority,
                mutable: event.newAuthority !== SYSTEM_PROGRAM_ADDRESS,
            };

        case InstructionType.Close:
            return { ...createEmptyState(), status: AccountStatus.Closed };

        case InstructionType.SetBuffer: {
            // SetBuffer copies a foreign buffer account's bytes into the IDL account. The fetcher
            // pre-resolves the buffer's bytes by replaying its own Writes; if that succeeded,
            // adopt the bytes here. Otherwise we mark content unknown — the live IDL fetch is the
            // remaining fallback.
            const bytes = bufferContents?.get(event.signature);
            if (bytes) {
                return {
                    ...prev,
                    bufferData: bytes,
                    content: tryDecodeContent(bytes),
                    dataSize: bytes.length,
                    status: AccountStatus.Active,
                };
            }
            return { ...prev, bufferData: new Uint8Array(0), content: undefined };
        }

        case InstructionType.Resize:
        case InstructionType.CreateBuffer:
            return prev;

        default:
            return prev;
    }
}

function applyWrite(prev: AnchorIdlState, event: AnchorIdlEvent): AnchorIdlState {
    // An empty Write is malformed for Anchor (Writes always carry data); treat as no-op. PMP's
    // equivalent path bumps status to Pending instead — see the comment there for the reasoning.
    if (!event.rawData || event.rawData.length === 0) return prev;

    const newData = new Uint8Array(prev.bufferData.length + event.rawData.length);
    newData.set(prev.bufferData);
    newData.set(event.rawData, prev.bufferData.length);

    return {
        ...prev,
        bufferData: newData,
        content: tryDecodeContent(newData),
        dataSize: newData.length,
        status: AccountStatus.Active,
    };
}

function tryDecodeContent(data: Uint8Array): string | undefined {
    try {
        const inflated = inflate(data);
        const decoded = new TextDecoder().decode(inflated);
        return tryPrettyJson(decoded);
    } catch {
        // Anchor IDLs are streamed in compressed chunks; intermediate decompression failures
        // are normal and just mean "not enough bytes yet".
        return undefined;
    }
}
