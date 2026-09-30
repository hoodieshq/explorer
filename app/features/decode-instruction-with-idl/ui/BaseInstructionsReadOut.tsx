import { Badge } from '@components/shared/ui/badge';
import { Button } from '@components/shared/ui/button';
import { Skeleton } from '@components/shared/ui/skeleton';
import { cn } from '@components/shared/utils';
import { BaseIntentSentence, shortenAddress, splitIntentSentence } from '@entities/idl';
import { ROW_PADDING } from '@shared/ui/spacing';
import { cva } from 'class-variance-authority';
import { type ReactNode, useId } from 'react';
import { ChevronDown } from 'react-feather';

import type { InstructionIntentState } from '../model/intent-state';

// Same reveal as the Accounts table rows: rows animate open instead of popping in.
const revealVariants = cva('grid transition-[grid-template-rows,opacity] duration-200 ease-in-out', {
    variants: { open: { false: 'grid-rows-[0fr] opacity-0', true: 'grid-rows-[1fr] opacity-100' } },
});

/**
 * "What this transaction does": every instruction's intent sentence, in order, behind a spoiler.
 * The Inspector's equivalent of a hardware wallet's review screen — it answers the whole-transaction
 * question that opening cards one by one does not. The control mirrors the Accounts table's row
 * expander: the whole header row toggles, with a ghost chevron button at its end.
 */
export function BaseInstructionsReadOut({
    count,
    open,
    onToggle,
    children,
    className,
}: {
    count: number;
    open: boolean;
    onToggle: () => void;
    /** The {@link BaseReadOutItem} rows. */
    children?: ReactNode;
    className?: string;
}) {
    const listId = useId();

    return (
        // The page background (#141816), a step darker than the card it sits in, sets the block apart.
        <div className={cn('flex flex-col bg-dark-background', ROW_PADDING, className)} data-testid="read-out">
            {/* Top-aligned like the Accounts table rows, so the chevron sits level with the first line of text. */}
            <div className="flex min-h-9 cursor-pointer items-start justify-between gap-3" onClick={onToggle}>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">What this transaction does</span>
                    <span className="text-xs text-outer-space-300">
                        {count} instruction{count === 1 ? '' : 's'}
                    </span>
                </div>
                <div className="flex shrink-0 items-center">
                    <Button
                        aria-expanded={open}
                        aria-controls={listId}
                        aria-label={open ? 'Hide intents' : 'Show intents'}
                        className="group !h-5 !w-5 [&_svg]:size-4"
                        onClick={event => {
                            // The header row toggles too; one click must not toggle twice.
                            event.stopPropagation();
                            onToggle();
                        }}
                        size="icon"
                        variant="ghost"
                        data-testid="read-out-trigger"
                    >
                        <ChevronDown
                            size={16}
                            className="text-outer-space-300 transition-transform duration-200 ease-in-out group-aria-expanded:rotate-180"
                        />
                    </Button>
                </div>
            </div>
            <div className={revealVariants({ open })}>
                <div className="min-h-0 overflow-hidden">
                    {/* One number column as wide as the widest "#N", 6px from the sentences: rows share it through
                        subgrid, so "#10" does not push its sentence out of line with "#9". */}
                    <ol
                        id={listId}
                        className="m-0 grid list-none grid-cols-[max-content_1fr] gap-x-1.5 p-0 pt-1.5"
                        aria-live="polite"
                        inert={!open}
                    >
                        {children}
                    </ol>
                </div>
            </div>
        </div>
    );
}

/**
 * One instruction in the read-out. An instruction without an intent keeps its row, named by its program the
 * way instruction cards name it (`getProgramName`), so the list always counts every instruction.
 */
export function BaseReadOutItem({
    index,
    programName,
    state,
}: {
    index: number;
    /** Shown in place of a sentence when the intent is unavailable, e.g. "Unknown Program (<address>)". */
    programName: string;
    state: InstructionIntentState;
}) {
    return (
        <li className="col-span-2 grid grid-cols-subgrid items-start py-1">
            {/* The number rides in a line box set like the sentence's (14px, normal leading), as an inline badge on
                its baseline — so "#N" shares the baseline of the sentence's first line, while the row stays
                top-aligned and a sentence that wraps runs on below. Grid `items-baseline` did not hold here. */}
            <div className="text-sm leading-normal">
                <Badge variant="success" className="align-baseline">
                    #{index + 1}
                </Badge>
            </div>
            {/* The text sits 1px lower than the "#N" badge beside it, as the design sets it. */}
            <div className="min-w-0 pt-px">
                <ReadOutSentence state={state} programName={programName} />
            </div>
        </li>
    );
}

function ReadOutSentence({ state, programName }: { state: InstructionIntentState; programName: string }) {
    switch (state.status) {
        case 'idle':
        case 'loading':
            return <Skeleton className="mt-1 h-3.5 w-3/4" />;
        case 'error':
            return (
                <span className="text-sm text-dk-danger">
                    Couldn&apos;t load the summary.{' '}
                    <button
                        type="button"
                        className="border-0 bg-transparent p-0 text-sm text-dark-accent underline-offset-2 hover:underline"
                        onClick={state.retry}
                    >
                        Retry
                    </button>
                </span>
            );
        case 'resolved':
            return <BaseIntentSentence sentence={state.display.interpolatedIntent ?? state.display.intent} size="sm" />;
        case 'unavailable':
            return (
                <span className="text-sm" data-testid="read-out-unavailable">
                    <span className="text-neutral-300">{shortenAddresses(programName)}</span>
                    <span className="text-outer-space-300"> · intent unavailable</span>
                </span>
            );
    }
}

// "Unknown Program (<address>)" would otherwise spend a whole line on the address.
function shortenAddresses(text: string): string {
    return splitIntentSentence(text)
        .map(part => (part.kind === 'address' ? shortenAddress(part.address) : part.text))
        .join('');
}
