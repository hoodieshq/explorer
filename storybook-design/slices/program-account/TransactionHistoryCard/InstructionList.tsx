// Ported from app/features/transaction-history/ui/InstructionList.tsx (pre-storybook).
// Tailwind `e-` prefix stripped for this repo's non-prefixed config; imports rewritten to @/app.
import React from 'react';

import { Skeleton } from '@/app/components/shared/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/shared/ui/tooltip';
import { TransactionInstructionInfo } from '@/app/utils/instruction';

const INLINE_LIMIT = 3;

// Inline overflow spoiler ("+N more") is temporarily disabled — we now render the
// full program list, however long it is. Kept (not deleted) so it can be flipped
// back on later by setting this to true.
const OVERFLOW_SPOILER_ENABLED: boolean = false;

type InstructionListProps = {
    instructions: TransactionInstructionInfo[];
    /** Optional element appended inline at the end of the first program row. */
    trailingAction?: React.ReactNode;
};

export function InstructionList({ instructions, trailingAction }: InstructionListProps) {
    const visible = OVERFLOW_SPOILER_ENABLED ? instructions.slice(0, INLINE_LIMIT) : instructions;
    const overflow = OVERFLOW_SPOILER_ENABLED ? instructions.slice(INLINE_LIMIT) : [];

    return (
        <div className="flex flex-col gap-1">
            {visible.map((instruction, i) => (
                <InstructionLine key={i} instruction={instruction} trailing={i === 0 ? trailingAction : undefined} />
            ))}
            {overflow.length > 0 && <OverflowLine instructions={overflow} />}
        </div>
    );
}

function InstructionLine({ instruction, trailing }: { instruction: TransactionInstructionInfo; trailing?: React.ReactNode }) {
    // Inline (not flex): program + instruction need to behave as one text run
    // so they wrap together at the cell boundary rather than each becoming a
    // separately-wrapping flex item with weird gaps between them.
    return (
        <span className="block cursor-default text-dk-base">
            <span className="text-outer-space-300">{instruction.program}</span>{' '}
            <span className="text-white">{instruction.name}</span>
            {trailing}
        </span>
    );
}

export function InstructionListSkeleton() {
    return (
        <div className="tx-instr-skeleton my-1 flex flex-col gap-1">
            <Skeleton className="h-3.5 w-44" />
            <Skeleton className="h-3.5 w-36" />
        </div>
    );
}

function OverflowLine({ instructions }: { instructions: TransactionInstructionInfo[] }) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-pointer text-dk-xs text-outer-space-300">+{instructions.length} more</span>
            </TooltipTrigger>
            <TooltipContent
                side="bottom"
                sideOffset={4}
                className="flex min-w-64 flex-col gap-1.5 rounded-lg border border-solid border-outer-space-800 bg-outer-space-900 p-3 shadow-md"
            >
                <span className="text-dk-xs font-medium text-white">Programs</span>
                {instructions.map((instruction, i) => (
                    <InstructionLine key={i} instruction={instruction} />
                ))}
            </TooltipContent>
        </Tooltip>
    );
}
