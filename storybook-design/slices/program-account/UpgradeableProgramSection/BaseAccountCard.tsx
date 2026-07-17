import React from 'react';
import { Code } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { RefreshButton } from '@/app/components/shared/ui/refresh-button';
import { cn } from '@/app/components/shared/utils';
import { Card, CardTitle } from '@/app/shared/ui/Card';

export type BaseAccountCardProps = {
    title: React.ReactNode;
    rawContent?: React.ReactNode;
    headerActions?: React.ReactNode;
    refresh?: () => void;
    analyticsSection?: string;
    showRawButton?: boolean;
    /** Renders the title + actions as a section header above the card (on the page
     * background) instead of inside the card — the Overview card's treatment. */
    headerOutside?: boolean;
    children: React.ReactNode;
};

export function BaseAccountCard({
    title,
    rawContent,
    headerActions,
    refresh,
    analyticsSection,
    showRawButton = true,
    headerOutside = false,
    children,
}: BaseAccountCardProps) {
    const [showRaw, setShowRaw] = React.useState(false);

    const header = (
        <>
            <CardTitle as="h3" ui="dashkit" className="flex flex-1 items-center gap-2">
                {title}
            </CardTitle>
            {refresh && analyticsSection && <RefreshButton analyticsSection={analyticsSection} onClick={refresh} />}
            {showRawButton && (
                <Button
                    variant="outline"
                    size="sm"
                    aria-label="Raw"
                    aria-pressed={showRaw}
                    onClick={() => setShowRaw(r => !r)}
                    // Match the sibling outline buttons (Refresh / Download); keep the
                    // original green toggle ring while active so the state stays legible.
                    className={cn(showRaw && 'shadow-[0_0_0_0.15rem_#33a382]')}
                >
                    <Code size={12} />
                    <span className="hidden md:inline">Raw</span>
                </Button>
            )}
            {headerActions}
        </>
    );

    // `overflow-x-clip` + `min-w-0` keep every row's content bounded to the card:
    // a value that can't wrap (long address/label/raw data) is clipped at the block
    // edge instead of spilling past the rounded border. `clip` (not `hidden`) leaves
    // the y-axis visible, so nothing turns into a scroll container. Portaled popovers
    // (tooltips, download dropdown, nickname modal) render outside this box, unaffected.
    const body = <div className="flex min-w-0 flex-col overflow-x-clip">{showRaw ? rawContent : children}</div>;

    if (headerOutside) {
        return (
            <>
                <div className="mb-3 flex items-center gap-2">{header}</div>
                <Card ui="dashkit">{body}</Card>
            </>
        );
    }

    return (
        <Card ui="dashkit">
            <div className="flex h-[60px] items-center gap-2 border-0 border-b border-solid border-dark-border px-dk-4 py-3">
                {header}
            </div>
            {body}
        </Card>
    );
}
