import React from 'react';
import { Code } from 'react-feather';

import { RefreshButton } from '@/app/components/shared/ui/refresh-button';
import { Button } from '@/app/components/shared/ui/button';
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
                    ui="dashkit"
                    variant="white"
                    active={showRaw}
                    size="sm"
                    aria-label="Raw"
                    onClick={() => setShowRaw(r => !r)}
                >
                    <Code size={12} />
                    <span className="hidden md:inline">Raw</span>
                </Button>
            )}
            {headerActions}
        </>
    );

    const body = <div className="flex flex-col">{showRaw ? rawContent : children}</div>;

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
