import React from 'react';
import { HelpCircle } from 'react-feather';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/shared/ui/tooltip';

// Surface matched to the transaction tables (see BaseDomainsCard) — set on a `variant="tight"` Card.
// `!rounded-lg` (8px) forces the radius over the tw base's `rounded-xl` (12px): without Preflight the
// two utilities collide and source order — not class order — would otherwise leave the card at 12px,
// out of step with the dashkit cards (Overview / transaction page) that sit at 8px.
export const TIGHT_CARD = 'overflow-hidden !rounded-lg border-outer-space-800 bg-outer-space-900';

// Column header label; when `help` is set it carries a help icon and a hover explanation. The icon is
// inline (not a flex item) so a long label like "Transactions, % of total" wraps naturally and the icon
// trails the last word ("total") instead of being pushed onto its own line.
export function HeaderLabel({ label, help }: { label: string; help?: string }) {
    if (!help) {
        return <>{label}</>;
    }
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <span className="cursor-help">
                    {label}
                    <HelpCircle size={14} className="ml-1 inline align-text-bottom" />
                </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-72 normal-case">{help}</TooltipContent>
        </Tooltip>
    );
}

// A count with its percentage in parentheses on one right-aligned mono line: "count (percent)".
// `tabular-nums` keeps digits aligned across rows.
export function BracketedFigure({ count, percent }: { count: string; percent: string }) {
    return (
        <div className="text-right tabular-nums">
            {count}
            <span className="text-outer-space-300"> ({percent})</span>
        </div>
    );
}
