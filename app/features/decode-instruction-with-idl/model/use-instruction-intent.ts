import type { TransactionInstruction } from '@solana/web3.js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useIntentExpansion } from './intent-expansion';
import { type InstructionDisplayState, useInstructionDisplayFromRaw } from './use-instruction-display-from-raw';

export type InstructionIntent = {
    /** False when the program publishes no intents: the card then shows no button at all. */
    available: boolean;
    open: boolean;
    toggle: () => void;
    state: InstructionDisplayState;
};

/**
 * Open/closed state and the resolved display behind one instruction card's "Intent" button.
 * Nothing is computed until the first open; after that the result stays cached, so closing and
 * reopening is free. A section-level "Show all intents" drives every card through the same path.
 */
export function useInstructionIntent({
    programId,
    raw,
    eligible = true,
    onRequestRaw,
}: {
    programId: string;
    raw: TransactionInstruction | undefined;
    /** False for instructions that cannot carry wire bytes (inner instructions). */
    eligible?: boolean;
    /** Asks for the raw transaction when `raw` is still missing; undefined once no request can produce it. */
    onRequestRaw?: () => void;
}): InstructionIntent {
    const [open, setOpen] = useState(false);
    // Latched, not tied to `open`: the display hook idles while disabled, and the cache does the rest.
    const [requested, setRequested] = useState(false);
    const { hasDisplay, state } = useInstructionDisplayFromRaw({ enabled: requested, programId, raw });
    const available = eligible && hasDisplay;

    // Read through a ref so a new callback identity from the card does not re-fire the expansion effect.
    const onRequestRawRef = useRef(onRequestRaw);
    onRequestRawRef.current = onRequestRaw;
    const rawRef = useRef(raw);
    rawRef.current = raw;

    const applyOpen = useCallback((next: boolean) => {
        setOpen(next);
        if (!next) return;

        setRequested(true);
        if (!rawRef.current) onRequestRawRef.current?.();
    }, []);

    const expansion = useIntentExpansion();
    const register = expansion?.register;
    useEffect(() => {
        if (!available || !register) return;
        return register();
    }, [available, register]);

    const command = expansion?.command;
    useEffect(() => {
        if (command && available) applyOpen(command.open);
    }, [command, available, applyOpen]);

    return {
        available,
        open,
        state: toCardState({ canRequestRaw: onRequestRaw !== undefined, raw, requested, state }),
        toggle: () => applyOpen(!open),
    };
}

// The display hook idles while there are no bytes to read, so a raw fetch that can still be answered is
// its own wait; one that cannot leaves nothing to summarise.
function toCardState({
    state,
    requested,
    raw,
    canRequestRaw,
}: {
    state: InstructionDisplayState;
    requested: boolean;
    raw: TransactionInstruction | undefined;
    canRequestRaw: boolean;
}): InstructionDisplayState {
    if (!requested || state.status !== 'idle') return state;
    if (raw === undefined && !canRequestRaw) return { display: undefined, status: 'resolved', usedAccountData: false };
    return { status: 'loading' };
}
