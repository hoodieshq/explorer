'use client';

import { type ReactNode, useId, useState } from 'react';

import type { InstructionFetchResult } from '../lib/intent';
import { BaseInstructionIntentList } from './BaseInstructionIntentList';
import { InstructionIntentListItem } from './InstructionIntentListItem';

export type InstructionIntentListEntry = { programId: string; ixFetchResult: InstructionFetchResult };

export function InstructionIntentList({ entries }: { entries: readonly InstructionIntentListEntry[] }): ReactNode {
    const listId = useId();
    const [open, setOpen] = useState(false);
    const [isOpened, setIsOpened] = useState(false);

    if (entries.length === 0) return undefined;

    const toggle = () => {
        setOpen(value => !value);
        setIsOpened(true);
    };

    return (
        <BaseInstructionIntentList ixsCount={entries.length} open={open} listId={listId} onToggle={toggle}>
            {entries.map(({ programId, ixFetchResult }, index) => (
                <InstructionIntentListItem
                    key={index}
                    index={index}
                    programId={programId}
                    ixFetchResult={ixFetchResult}
                    enabled={isOpened}
                />
            ))}
        </BaseInstructionIntentList>
    );
}
