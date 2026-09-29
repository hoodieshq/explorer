import type { TransactionInstruction } from '@solana/web3.js';
import { useState } from 'react';

import { type InstructionDisplayState, useInstructionDisplayFromRaw } from '../model/use-instruction-display-from-raw';
import { BaseInstructionsReadOut, BaseReadOutItem } from './BaseInstructionsReadOut';

/**
 * The read-out for a decoded message. Runs on click only; each row resolves through the same cached
 * computation as the card's "Intent" button, so opening a card afterwards costs nothing.
 */
export function InstructionsReadOut({
    instructions,
    className,
}: {
    instructions: TransactionInstruction[];
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    // Latched: once read, closing the list keeps the results cached for the next open.
    const [requested, setRequested] = useState(false);

    return (
        <BaseInstructionsReadOut
            count={instructions.length}
            open={open}
            onToggle={() => {
                setOpen(!open);
                setRequested(true);
            }}
            className={className}
        >
            {/* Index key: the list is the message's instruction order, which never reorders. */}
            {instructions.map((instruction, index) => (
                <ReadOutItem key={index} index={index} instruction={instruction} enabled={requested} />
            ))}
        </BaseInstructionsReadOut>
    );
}

function ReadOutItem({
    index,
    instruction,
    enabled,
}: {
    index: number;
    instruction: TransactionInstruction;
    enabled: boolean;
}) {
    const { hasDisplay, isIdlLoading, state } = useInstructionDisplayFromRaw({
        enabled,
        programId: instruction.programId.toBase58(),
        raw: instruction,
    });

    return <BaseReadOutItem index={index} state={toRowState({ hasDisplay, isIdlLoading, state })} />;
}

// A program without published intents settles at once as "no summary", rather than idling as a skeleton.
function toRowState({
    hasDisplay,
    isIdlLoading,
    state,
}: {
    hasDisplay: boolean;
    isIdlLoading: boolean;
    state: InstructionDisplayState;
}): InstructionDisplayState {
    if (hasDisplay) return state;
    if (isIdlLoading) return { status: 'loading' };
    return { display: undefined, status: 'resolved', usedAccountData: false };
}
