'use client';

import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { cn } from '@/app/components/shared/utils';
import { Card } from '@/app/shared/ui/Card';

// Page-wide cell metrics: 12px horizontal (px-3) / 8px vertical (py-2) padding, top-aligned. These
// are standard Tailwind arbitrary-variant utilities — the same mechanism BaseTable uses for its own
// cell styling — applied on the table via className. `!` beats BaseTable's base `p-4` + `align-middle`
// and the card variant's `pl-6/pr-6` edge padding (all equal-specificity), giving uniform 12px edges.
// (Requires `./storybook-design/**` in tailwind.config content, otherwise these slice-only classes
// aren't generated.)
export const ROW_CELLS = [
    '[&_th]:!px-3 [&_th]:!py-2 [&_td]:!px-3 [&_td]:!py-2',
    '[&_thead_th:first-child]:!pl-3 [&_thead_th:last-child]:!pr-3',
    '[&_tbody_td:first-child]:!pl-3 [&_tbody_td:last-child]:!pr-3',
    '[&_th]:!align-top [&_td]:!align-top',
].join(' ');

// Header styling matched to the transaction page's table headers (explorer.solana.com): transparent
// background, `text-outer-space-300`, 12px, no letter-spacing, and a single `border-white/10` bottom
// rule (the first body row's top border is zeroed so there's no doubled line beneath the head).
export const HEADER_CELLS = [
    '[&_thead_th]:!bg-transparent [&_thead_th]:!text-outer-space-300',
    '[&_thead_th]:!text-xs [&_thead_th]:!tracking-normal',
    '[&_thead_th]:!border-t-0 [&_thead_th]:!border-b [&_thead_th]:!border-white/10',
    '[&_tbody_tr:first-child_td]:!border-t-0',
].join(' ');

// Slice-local section shell. Mirrors the transaction page's CollapsibleSection: the section title
// is an <h2> lifted OUT of the card, sitting above a bare card that carries only the body (no
// in-card header row). `gap-3` between title and card + the card's own `mb-6` moved onto the
// wrapping <section> so vertical rhythm is unchanged. `collapsible` adds the Expand/Collapse control
// and grid-rows collapse animation exactly as CollapsibleSection does; `note` renders a block under
// the title (and inside the collapsible region, so it hides/shows with the card).
export function SectionCard({
    actions,
    bare = false,
    children,
    collapsible = false,
    defaultExpanded = true,
    note,
    title,
}: {
    actions?: ReactNode;
    // When true the children are rendered as-is (no wrapping Card). Table sections use this so they
    // can supply their OWN card on md+ (the desktop table) and a bare stack of per-row cards below md.
    bare?: boolean;
    children: ReactNode;
    collapsible?: boolean;
    defaultExpanded?: boolean;
    note?: ReactNode;
    title: ReactNode;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const card = bare ? (
        children
    ) : (
        <Card ui="dashkit" marginBottom="none" className="!border-outer-space-800">
            {children}
        </Card>
    );

    return (
        <section className="mb-6 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="m-0 text-lg font-normal text-white">{title}</h2>
                {(actions || collapsible) && (
                    <div className="flex items-center gap-1">
                        {actions}
                        {collapsible && (
                            <Button
                                className="md:min-w-[86px]"
                                variant="outline"
                                size="sm"
                                aria-expanded={expanded}
                                aria-label={expanded ? 'Collapse' : 'Expand'}
                                onClick={() => setExpanded(v => !v)}
                            >
                                <ChevronDown
                                    size={12}
                                    className={cn(
                                        'transition-transform duration-200 ease-in-out',
                                        expanded && '[transform:rotate(180deg)]',
                                    )}
                                />
                                <span className="hidden md:inline-block">{expanded ? 'Collapse' : 'Expand'}</span>
                            </Button>
                        )}
                    </div>
                )}
            </div>
            {collapsible ? (
                <div
                    className={cn(
                        'grid transition-[grid-template-rows] duration-200 ease-in-out',
                        expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                >
                    <div className="flex flex-col gap-3 overflow-hidden">
                        {note}
                        {card}
                    </div>
                </div>
            ) : (
                <>
                    {note}
                    {card}
                </>
            )}
        </section>
    );
}
