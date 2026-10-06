import type { InstructionDisplay } from '@codama/dynamic-instructions';
import { Button } from '@components/shared/ui/button';
import { Skeleton } from '@components/shared/ui/skeleton';
import { cn } from '@components/shared/utils';
import { BaseIntentSentence } from '@entities/idl';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';

import type { InstructionIntentState, IntentUnavailableReason } from '../model/intent-state';

// Said after "Couldn't get the intent:", so the reader learns which part of the chain is missing.
const UNAVAILABLE_REASONS: Record<IntentUnavailableReason, string> = {
    'no-bytes': 'the RPC returned this instruction already decoded, without the raw bytes an intent is built from.',
    'no-metadata': "this program doesn't publish intent metadata.",
    'not-identified': "the program's intent metadata doesn't describe this instruction.",
};

const TONE_BY_STATUS = {
    error: 'error',
    loading: 'default',
    resolved: 'default',
    unavailable: 'default',
} as const;

// Padded like the card table's cells around it: 16px top and bottom (`p-4`), 24px at the sides as the edge
// cells are (`pl-6` / `pr-6`), so the row's text lines up with the Program and account rows below.
// Both edges use the card outline colour (as the Overview card does), so the intent row reads as its own
// block inside the card rather than as one more data row. The card drops its header line while it shows.
const panelVariants = cva(
    'flex flex-col gap-2 whitespace-normal border-0 border-y border-solid border-outer-space-800 px-6 py-4 text-left',
    {
        defaultVariants: { tone: 'default' },
        variants: {
            tone: {
                // The same dark ground as the transaction's "What this transaction does" block (the page
                // background, a step darker than the card), so the two intent surfaces read as one.
                default: 'bg-dark-background',
                error: 'bg-dk-danger/5',
            },
        },
    },
);

/**
 * The intent row at the top of an instruction card body: the SDK's sentence only. The SDK's labelled fields
 * are left out because the card rows right below carry the same accounts and arguments.
 * Inline rather than floating, so the summary and the card rows below it stay readable side by side.
 */
export function BaseInstructionIntentPanel({
    state,
    id,
    className,
}: {
    state: Exclude<InstructionIntentState, { status: 'idle' }>;
    id?: string;
    className?: string;
}) {
    return (
        <div
            id={id}
            className={cn(panelVariants({ tone: TONE_BY_STATUS[state.status] }), className)}
            aria-live="polite"
            data-testid="instruction-intent-panel"
        >
            <PanelBody state={state} />
        </div>
    );
}

function PanelBody({ state }: { state: Exclude<InstructionIntentState, { status: 'idle' }> }) {
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
                    <PanelLabel tone="error">Intent</PanelLabel>
                    <p className="m-0 text-sm text-neutral-300">
                        Couldn&apos;t get the intent: the RPC node didn&apos;t return the accounts it needs. The details
                        below are unaffected.
                    </p>
                    <div>
                        <Button variant="outline" size="sm" onClick={state.retry}>
                            Retry
                        </Button>
                    </div>
                </>
            );
        case 'resolved':
            return <ResolvedBody display={state.display} usedAccountData={state.usedAccountData} />;
        case 'unavailable':
            return (
                <>
                    <PanelLabel>Intent</PanelLabel>
                    <p className="m-0 text-sm text-neutral-400" data-testid="instruction-intent-unavailable">
                        Couldn&apos;t get the intent: {UNAVAILABLE_REASONS[state.reason]}
                    </p>
                </>
            );
    }
}

function ResolvedBody({ display, usedAccountData }: { display: InstructionDisplay; usedAccountData: boolean }) {
    const hasSentence = display.interpolatedIntent !== null;

    return (
        <>
            <PanelLabel>Intent</PanelLabel>
            <BaseIntentSentence sentence={display.interpolatedIntent ?? display.intent} size="sm" />
            {!hasSentence && (
                <PanelFoot>No sentence in this program&apos;s metadata; the rows below carry the details.</PanelFoot>
            )}
            {usedAccountData && (
                <PanelFoot>Uses current account data, which may differ from the time of this transaction.</PanelFoot>
            )}
        </>
    );
}

// Sized as the card table's column headers ("ACCOUNT NAME": `text-dk-xs`, 0.08em tracking), since it heads
// the rows below in the same way. `-mb-1`: 4px from the label to what it names, against the panel's 8px gap.
// Quiet text takes a Summary row label's colour (KeyValue); a failure takes the app's danger colour
// (`dk-danger`, see Design System/Palette → Agreements).
const labelVariants = cva('-mb-1 text-dk-xs font-medium uppercase tracking-[0.08em]', {
    defaultVariants: { tone: 'default' },
    variants: { tone: { default: 'text-outer-space-300', error: 'text-dk-danger' } },
});

function PanelLabel({ children, tone }: { children: ReactNode } & VariantProps<typeof labelVariants>) {
    return <span className={labelVariants({ tone })}>{children}</span>;
}

function PanelFoot({ children }: { children: ReactNode }) {
    return <p className="m-0 text-xs text-outer-space-300">{children}</p>;
}
