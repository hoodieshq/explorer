import React from 'react';

import { Card, CardTitle } from '@/app/shared/ui/Card';

/**
 * The Overview-card treatment shared by every program-account tab card, lifted from
 * `UpgradeableProgramSection` (BaseAccountCard's `headerOutside` branch): the title —
 * plus any header actions — sits on the page background above the card, and the card
 * body is a single `overflow-x-clip` / `min-w-0` column so an unwrappable value
 * (address, hash, verify command) is clipped at the block edge instead of spilling
 * past the rounded border or turning the row into a horizontal scroll container.
 *
 * Unlike BaseAccountCard this drops the Raw toggle + download/refresh actions that only
 * make sense for a full Account — the tab cards render presentational data, so they get
 * the same frame without the account chrome.
 */
export function SectionCard({
    title,
    headerActions,
    note,
    children,
}: {
    title: React.ReactNode;
    /** Rendered to the right of the title in the outside header (e.g. a badge or Download button). */
    headerActions?: React.ReactNode;
    /**
     * Optional standalone note (e.g. an `InfoCard`) rendered in the gap between the outside
     * header and the card — the H-explorer-pre-sorybook treatment for the Security.txt caveat.
     */
    note?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <>
            <div className="mb-3 flex items-center gap-2">
                <CardTitle as="h3" ui="dashkit" className="flex flex-1 items-center gap-2">
                    {title}
                </CardTitle>
                {headerActions}
            </div>
            {note && <div className="mb-3">{note}</div>}
            <Card ui="dashkit">
                <div className="flex min-w-0 flex-col overflow-x-clip">{children}</div>
            </Card>
        </>
    );
}
