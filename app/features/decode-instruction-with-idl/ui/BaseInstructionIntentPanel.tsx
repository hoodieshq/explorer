import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { Button } from '@components/shared/ui/button';
import { Skeleton } from '@components/shared/ui/skeleton';
import { cn } from '@components/shared/utils';
import { BaseDisplayFields, BaseIntentSentence } from '@entities/idl';
import { cva } from 'class-variance-authority';
import type { ReactNode } from 'react';

import type { InstructionDisplayState } from '../model/use-instruction-display-from-raw';

const panelVariants = cva('flex flex-col gap-2 whitespace-normal px-4 py-3.5 text-left', {
    defaultVariants: { tone: 'default' },
    variants: {
        tone: {
            default: 'bg-dark-accent/5',
            error: 'bg-red-300/5',
        },
    },
});

/**
 * The intent row at the top of an instruction card body: the SDK's sentence plus its labelled fields.
 * Inline rather than floating, so the summary and the card rows below it stay readable side by side.
 */
export function BaseInstructionIntentPanel({
    state,
    id,
    className,
}: {
    state: Exclude<InstructionDisplayState, { status: 'idle' }>;
    id?: string;
    className?: string;
}) {
    return (
        <div
            id={id}
            className={cn(panelVariants({ tone: state.status === 'error' ? 'error' : 'default' }), className)}
            aria-live="polite"
            data-testid="instruction-intent-panel"
        >
            <PanelBody state={state} />
        </div>
    );
}

function PanelBody({ state }: { state: Exclude<InstructionDisplayState, { status: 'idle' }> }) {
    switch (state.status) {
        case 'loading':
            return (
                <>
                    <PanelLabel>Intent</PanelLabel>
                    <div className="flex flex-col gap-2" data-testid="instruction-intent-loading">
                        <Skeleton className="h-3.5 w-[90%]" />
                        <Skeleton className="h-3.5 w-[55%]" />
                    </div>
                </>
            );
        case 'error':
            return (
                <>
                    <PanelLabel className="text-red-300">Couldn&apos;t load</PanelLabel>
                    <p className="m-0 text-sm text-neutral-300">
                        The RPC node didn&apos;t return the accounts this summary needs. The details below are
                        unaffected.
                    </p>
                    <div>
                        <Button variant="outline" size="sm" onClick={state.retry}>
                            Retry
                        </Button>
                    </div>
                </>
            );
        case 'resolved':
            return state.display ? (
                <ResolvedBody display={state.display} usedAccountData={state.usedAccountData} />
            ) : (
                <>
                    <PanelLabel>Intent</PanelLabel>
                    <p className="m-0 text-sm text-neutral-400">No summary available for this instruction.</p>
                </>
            );
    }
}

function ResolvedBody({ display, usedAccountData }: { display: InstructionDisplay; usedAccountData: boolean }) {
    const hasSentence = display.interpolatedIntent !== null;

    return (
        <>
            <PanelLabel>Intent</PanelLabel>
            <BaseIntentSentence sentence={display.interpolatedIntent ?? display.intent} />
            {display.fields.length > 0 && <BaseDisplayFields fields={display.fields} />}
            {!hasSentence && (
                <PanelFoot>No sentence in this program&apos;s metadata, so its fields are shown instead.</PanelFoot>
            )}
            {usedAccountData && (
                <PanelFoot>Uses current account data, which may differ from the time of this transaction.</PanelFoot>
            )}
        </>
    );
}

function PanelLabel({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <span className={cn('text-[11px] font-medium uppercase tracking-[0.1em] text-neutral-400', className)}>
            {children}
        </span>
    );
}

function PanelFoot({ children }: { children: ReactNode }) {
    return <p className="m-0 text-xs text-neutral-400">{children}</p>;
}
