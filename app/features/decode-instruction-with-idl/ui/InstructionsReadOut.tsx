import { useCluster } from '@entities/cluster';
import type { TransactionInstruction } from '@solana/web3.js';
import { getProgramName } from '@utils/tx';
import { useState } from 'react';

import { toIntentState } from '../model/intent-state';
import { useInstructionDisplayFromRaw } from '../model/use-instruction-display-from-raw';
import { BaseInstructionsReadOut, BaseReadOutItem } from './BaseInstructionsReadOut';

/** One top-level instruction of the transaction; `raw` is undefined while its wire bytes are not in hand. */
export type ReadOutInstruction = { programId: string; raw: TransactionInstruction | undefined };

/**
 * The read-out for a transaction's top-level instructions. Runs on click only; each row resolves through
 * the same cached computation as the card's "Intent" button, so opening a card afterwards costs nothing.
 */
export function InstructionsReadOut({
    instructions,
    canRequestRaw = false,
    onRequestRaw,
    className,
}: {
    instructions: ReadOutInstruction[];
    /** Missing bytes can still arrive (e.g. a raw-transaction fetch is under way); rows wait instead of giving up. */
    canRequestRaw?: boolean;
    /** Asks for the missing bytes on first open. */
    onRequestRaw?: () => void;
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
                if (!requested && instructions.some(instruction => !instruction.raw)) onRequestRaw?.();
                setRequested(true);
            }}
            className={className}
        >
            {/* Index key: the list is the message's instruction order, which never reorders. */}
            {instructions.map((instruction, index) => (
                <ReadOutItem
                    key={index}
                    index={index}
                    instruction={instruction}
                    canRequestRaw={canRequestRaw}
                    requested={requested}
                />
            ))}
        </BaseInstructionsReadOut>
    );
}

function ReadOutItem({
    index,
    instruction: { programId, raw },
    canRequestRaw,
    requested,
}: {
    index: number;
    instruction: ReadOutInstruction;
    canRequestRaw: boolean;
    requested: boolean;
}) {
    const { cluster } = useCluster();
    const { hasDisplay, isIdlLoading, state } = useInstructionDisplayFromRaw({ enabled: requested, programId, raw });

    return (
        <BaseReadOutItem
            index={index}
            programName={getProgramName(programId, cluster)}
            state={toIntentState({ canRequestRaw, display: state, hasDisplay, isIdlLoading, raw, requested })}
        />
    );
}
