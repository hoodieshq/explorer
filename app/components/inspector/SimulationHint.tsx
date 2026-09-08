import { cn } from '@components/shared/utils';
import type { ReactNode } from 'react';

import { Button } from '@/app/components/shared/ui/button';
import { type SimulationState } from '@/app/features/instruction-simulation/model/use-simulation';
import { SIM_ZONE_STYLE } from '@/app/features/instruction-simulation/ui/sim-zone-style';
import { SimulateButton } from '@/app/features/instruction-simulation/ui/SimulateButton';

import { hasReliableChanges } from './simulation-changes';

// Shared shell for the inspector's simulation hints: one line of body-sized text and its action, wrapping
// onto a second row on narrow screens. `actionSide` decides whether the action leads the sentence or sits
// pushed out to the far end of the line. Plain text — any surface comes from the caller.
function HintLine({
    action,
    actionSide = 'leading',
    children,
    className,
}: {
    action: ReactNode;
    actionSide?: 'leading' | 'trailing';
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={cn(
                'flex flex-wrap items-center gap-2 text-sm text-outer-space-300',
                actionSide === 'trailing' && 'justify-between gap-3',
                className,
            )}
        >
            {actionSide === 'leading' && action}
            <p className="m-0">{children}</p>
            {actionSide === 'trailing' && action}
        </div>
    );
}

// In-sentence anchor. styles.css colours every <a> dashkit green; these read as body text, so the grey is
// restored explicitly (a plain class beats the `a` element selector) and underlined. The targets carry
// `scroll-margin-top: var(--sticky-header-height)` so the sticky tab bar does not cover them, and the app
// sets `scroll-behavior: smooth` globally.
function HintAnchor({ href, children }: { href: string; children: ReactNode }) {
    return (
        <a href={href} className="text-outer-space-300 underline hover:text-white">
            {children}
        </a>
    );
}

// The line above the Account List card explaining an empty Change column, shown while the column has
// nothing to show (before a run, during one, and after a failed one). Its action runs the simulation
// right there: `sm` height — two steps up from the Change column's row-hover button, which is pinned to
// the row's text line — with that size's own `text-xs` label, the size every other button in the app uses.
export function SimulationHint({ className, simulation }: { className?: string; simulation: SimulationState }) {
    // Nothing to explain once a run has produced deltas: the Change column speaks for itself.
    if (hasReliableChanges(simulation)) return undefined;

    return (
        <HintLine
            className={className}
            action={<SimulateButton simulation={simulation} size="sm" className="shrink-0" />}
        >
            Simulate to see balance changes. Full result appears in the <HintAnchor href="#logs">Logs block</HintAnchor>{' '}
            below.
        </HintLine>
    );
}

// The band under the Overview: read before anything is scrolled, it says where simulation lives rather
// than starting one, so its action is navigation — a jump to the Simulation block — and the running of it
// stays with the controls down there and on the Account List. It wears the same green noise backing
// (SIM_ZONE_STYLE), outer-space border and padding rhythm as the Simulation card at the bottom of the
// page, so the two read as the same zone; `overflow-hidden` keeps the tiled grain inside the rounded
// corners.
export function SimulationJumpHint({ className }: { className?: string }) {
    return (
        <div
            style={SIM_ZONE_STYLE}
            className={cn('overflow-hidden rounded-lg border border-solid border-outer-space-800 px-3 py-4', className)}
        >
            <HintLine
                actionSide="trailing"
                action={
                    <Button asChild variant="outline" size="sm" className="shrink-0 no-underline">
                        <a href="#simulation">Go to simulation</a>
                    </Button>
                }
            >
                Looking for a simulation? Run it below for balance changes and full{' '}
                <HintAnchor href="#logs">logs</HintAnchor>.
            </HintLine>
        </div>
    );
}
