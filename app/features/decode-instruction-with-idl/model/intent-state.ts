import type { TransactionInstruction } from '@solana/web3.js';

import type { InstructionDisplayResult, InstructionDisplayState } from './use-instruction-display-from-raw';

/** Why an instruction has no intent to show. */
export type IntentUnavailableReason =
    /** The program's IDL publishes no sRFC 39 display metadata. */
    | 'no-metadata'
    /** The RPC returned the instruction already decoded, without the wire bytes the display is built from. */
    | 'no-bytes'
    /** The IDL publishes intents, but does not describe this particular instruction. */
    | 'not-identified';

/** What an intent affordance shows: the display computation's state, or why there is nothing to compute. */
export type InstructionIntentState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'error'; retry: () => void }
    | { status: 'resolved'; display: NonNullable<InstructionDisplayResult['display']>; usedAccountData: boolean }
    | { status: 'unavailable'; reason: IntentUnavailableReason };

/**
 * Folds what is known about an instruction into one intent state. The unavailable reasons that are known
 * before any computation (no metadata, no bytes) are reported without one; `requested` only gates the rest.
 */
export function toIntentState({
    display,
    hasDisplay,
    isIdlLoading,
    raw,
    canRequestRaw,
    requested,
}: {
    display: InstructionDisplayState;
    hasDisplay: boolean;
    isIdlLoading: boolean;
    raw: TransactionInstruction | undefined;
    /** A raw-transaction fetch can still produce the missing bytes. */
    canRequestRaw: boolean;
    requested: boolean;
}): InstructionIntentState {
    if (isIdlLoading) return requested ? { status: 'loading' } : { status: 'idle' };
    if (!hasDisplay) return { reason: 'no-metadata', status: 'unavailable' };
    if (raw === undefined && !canRequestRaw) return { reason: 'no-bytes', status: 'unavailable' };
    if (!requested) return { status: 'idle' };

    switch (display.status) {
        // The display hook idles while there are no bytes yet, so a fetch that can still answer is its own wait.
        case 'idle':
        case 'loading':
            return { status: 'loading' };
        case 'error':
            return display;
        case 'resolved':
            return display.display
                ? { display: display.display, status: 'resolved', usedAccountData: display.usedAccountData }
                : { reason: 'not-identified', status: 'unavailable' };
    }
}

/** True for the states that mean "we could not get this intent", which the button shows before it is opened. */
export function isIntentMissing(state: InstructionIntentState): boolean {
    return state.status === 'unavailable' || state.status === 'error';
}
