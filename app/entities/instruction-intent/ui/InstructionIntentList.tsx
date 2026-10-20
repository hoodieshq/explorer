'use client';

import { type ReactNode, useId, useState } from 'react';

import type { InstructionFetchResult } from '../lib/intent';
import { BaseInstructionIntentList } from './BaseInstructionIntentList';
import { InstructionIntentListItem } from './InstructionIntentListItem';

export type InstructionIntentListEntry = { programId: string; ixFetchResult: InstructionFetchResult };

export function InstructionIntentList({
    instructions,
    className,
}: {
    instructions: readonly InstructionIntentListEntry[];
    className?: string;
}): ReactNode {
    const listId = useId();
    const [open, setOpen] = useState(false);
    const [enabled, setEnabled] = useState(false);

    if (instructions.length === 0) return undefined;

    const toggle = () => {
        setOpen(value => !value);
        setEnabled(true);
    };

    return (
        <BaseInstructionIntentList
            ixsCount={instructions.length}
            open={open}
            listId={listId}
            aria-controls={listId}
            onToggle={toggle}
            className={className}
        >
            {instructions.map(({ programId, ixFetchResult }, index) => (
                // Instruction order in a message never changes, so the index is a stable key
                <InstructionIntentListItem
                    key={index}
                    index={index}
                    programId={programId}
                    ixFetchResult={ixFetchResult}
                    enabled={enabled}
                />
            ))}
        </BaseInstructionIntentList>
    );
}
