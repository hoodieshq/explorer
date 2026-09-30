import type { TransactionInstruction } from '@solana/web3.js';
import { useState } from 'react';

import { type InstructionIntentState, toIntentState } from './intent-state';
import { useInstructionDisplayFromRaw } from './use-instruction-display-from-raw';

export type InstructionIntent = {
    open: boolean;
    toggle: () => void;
    state: InstructionIntentState;
};

/**
 * Open/closed state and the resolved display behind one instruction card's "Intent" button.
 * Every card offers the button; an instruction whose intent cannot be had reports why instead.
 * Nothing is computed until the first open, and the result stays cached, so reopening is free.
 */
export function useInstructionIntent({
    programId,
    raw,
    onRequestRaw,
}: {
    programId: string;
    raw: TransactionInstruction | undefined;
    /** Asks for the raw transaction when `raw` is still missing; undefined once no request can produce it. */
    onRequestRaw?: () => void;
}): InstructionIntent {
    const [open, setOpen] = useState(false);
    // Latched, not tied to `open`: the display hook idles while disabled, and the cache does the rest.
    const [requested, setRequested] = useState(false);
    const {
        hasDisplay,
        isIdlLoading,
        state: display,
    } = useInstructionDisplayFromRaw({
        enabled: requested,
        programId,
        raw,
    });
    const canRequestRaw = onRequestRaw !== undefined;
    const state = toIntentState({ canRequestRaw, display, hasDisplay, isIdlLoading, raw, requested });

    const toggle = () => {
        setOpen(!open);
        if (open) return;

        setRequested(true);
        if (!raw) onRequestRaw?.();
    };

    return { open, state, toggle };
}
