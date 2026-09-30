import type { TransactionInstruction } from '@solana/web3.js';
import { type ReactNode, useId } from 'react';

import { isIntentMissing } from '../model/intent-state';
import { useInstructionIntent } from '../model/use-instruction-intent';
import { BaseInstructionIntentButton } from './BaseInstructionIntentButton';
import { BaseInstructionIntentPanel } from './BaseInstructionIntentPanel';

/**
 * The two halves of an instruction card's intent: the header button and the row it opens at the top of
 * the card body. Returned as slots because the card places them in different parts of its layout while
 * they share one open state.
 */
export function useInstructionIntentSlots(params: {
    programId: string;
    raw: TransactionInstruction | undefined;
    onRequestRaw?: () => void;
}): { button: ReactNode; panel: ReactNode } {
    const panelId = useId();
    const { open, state, toggle } = useInstructionIntent(params);

    return {
        button: (
            <BaseInstructionIntentButton
                open={open}
                busy={open && state.status === 'loading'}
                missing={isIntentMissing(state)}
                controls={panelId}
                onClick={toggle}
            />
        ),
        panel: open && state.status !== 'idle' ? <BaseInstructionIntentPanel id={panelId} state={state} /> : undefined,
    };
}
