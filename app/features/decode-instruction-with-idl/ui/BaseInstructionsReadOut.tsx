import { Badge } from '@components/shared/ui/badge';
import { Button } from '@components/shared/ui/button';
import { Skeleton } from '@components/shared/ui/skeleton';
import { cn } from '@components/shared/utils';
import { BaseIntentSentence } from '@entities/idl';
import { type ReactNode, useId } from 'react';
import { AlignLeft } from 'react-feather';

import type { InstructionDisplayState } from '../model/use-instruction-display-from-raw';

/**
 * "What this transaction does": every instruction's intent sentence, in order, behind one click.
 * The Inspector's equivalent of a hardware wallet's review screen — it answers the whole-transaction
 * question that opening cards one by one does not.
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
    /** The {@link BaseReadOutItem} rows; rendered only while open. */
    children?: ReactNode;
    className?: string;
}) {
    const listId = useId();

    return (
        <div className={cn('flex flex-col gap-2.5 bg-dark-accent/5 px-6 py-3.5', className)} data-testid="read-out">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">What this transaction does</span>
                    <span className="text-xs text-neutral-400">
                        {count} instruction{count === 1 ? '' : 's'}
                        {open ? '' : ' · loads on request'}
                    </span>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    aria-expanded={open}
                    aria-controls={listId}
                    onClick={onToggle}
                    data-testid="read-out-trigger"
                >
                    <AlignLeft />
                    {open ? 'Hide' : 'Read out'}
                </Button>
            </div>
            {open && (
                <ol id={listId} className="m-0 flex list-none flex-col p-0" aria-live="polite">
                    {children}
                </ol>
            )}
        </div>
    );
}

/**
 * One instruction in the read-out. An instruction without a summary keeps its row, so the list always
 * counts every instruction in the transaction.
 */
export function BaseReadOutItem({ index, state }: { index: number; state: InstructionDisplayState }) {
    return (
        <li className="grid grid-cols-[2.25rem_1fr] gap-2 border-0 border-t border-solid border-dark-border py-2">
            <Badge variant="success" className="mt-0.5 h-fit">
                #{index + 1}
            </Badge>
            <ReadOutSentence state={state} />
        </li>
    );
}

function ReadOutSentence({ state }: { state: InstructionDisplayState }) {
    switch (state.status) {
        case 'idle':
        case 'loading':
            return <Skeleton className="mt-1 h-3.5 w-3/4" />;
        case 'error':
            return (
                <span className="text-sm text-red-300">
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
            return state.display ? (
                <BaseIntentSentence
                    sentence={state.display.interpolatedIntent ?? state.display.intent}
                    className="text-sm"
                />
            ) : (
                <span className="text-sm text-neutral-400">No summary available</span>
            );
    }
}
