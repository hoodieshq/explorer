import type { TransactionInstruction } from '@solana/web3.js';
import { type ReactNode, useId } from 'react';

import { useInstructionIntent } from '../model/use-instruction-intent';
import { BaseInstructionIntentButton } from './BaseInstructionIntentButton';
import { BaseInstructionIntentPanel } from './BaseInstructionIntentPanel';

/**
 * The two halves of an instruction card's intent: the header button and the row it opens at the top of
 * the card body. Returned as slots because the card places them in different parts of its layout while
 * they share one open state. Both are undefined when the program publishes no intents — the card never
 * shows a disabled button.
 */
export function useInstructionIntentSlots(params: {
    programId: string;
    raw: TransactionInstruction | undefined;
    eligible?: boolean;
    onRequestRaw?: () => void;
}): { button: ReactNode; panel: ReactNode } {
    const panelId = useId();
    const { available, open, state, toggle } = useInstructionIntent(params);

    if (!available) return { button: undefined, panel: undefined };

    return {
        button: (
            <BaseInstructionIntentButton
                open={open}
                busy={open && state.status === 'loading'}
                controls={panelId}
                onClick={toggle}
            />
        ),
        panel: open && state.status !== 'idle' ? <BaseInstructionIntentPanel id={panelId} state={state} /> : undefined,
    };
}
