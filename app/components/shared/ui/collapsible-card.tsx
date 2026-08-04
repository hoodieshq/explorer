// TODO(fsd): relocate this module to @shared or the appropriate feature/entity layer.
import { cn } from '@components/shared/utils';
import { forwardRef, ReactNode, useId, useState } from 'react';
import { ChevronDown } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { BaseCard, BaseCardHeader, BaseCardTitle } from '@/app/shared/ui/Card';

// `headingPlacement` picks how the title/toggle sit relative to the collapsible surface:
// - `inside` (default) — title lives inside the dashkit card header. The original behaviour; every
//   existing consumer relies on it, so its markup is kept byte-for-byte.
// - `lifted` — title is lifted out into an `<h2>` *above* the surface (a `<section aria-labelledby>`
//   with the toggle in the heading row), mirroring the transaction page's `CollapsibleSection`. Here
//   `children` supplies its own surface, so callers pick the card style (tight/dashkit/…) per case.
//   Rebuilt on the shared layer so entities can consume it — FSD forbids entity → feature, which is
//   why the domains card couldn't import `CollapsibleSection` and had to inline the same pattern.
type HeadingPlacement = 'inside' | 'lifted';

type CollapsibleCardProps = {
    title: ReactNode;
    children: ReactNode;
    defaultExpanded?: boolean;
    className?: string;
    headerButtons?: ReactNode;
    collapsible?: boolean;
    headingPlacement?: HeadingPlacement;
};

export const CollapsibleCard = forwardRef<HTMLDivElement, CollapsibleCardProps>(
    (
        {
            title,
            children,
            defaultExpanded = true,
            className,
            headerButtons,
            collapsible = true,
            headingPlacement = 'inside',
        },
        ref,
    ) => {
        const [expanded, setExpanded] = useState(defaultExpanded);
        const toggle = () => setExpanded(current => !current);
        // Called unconditionally (hooks rule); only consumed by the lifted branch.
        const headingId = useId();

        if (headingPlacement === 'lifted') {
            return (
                <section aria-labelledby={headingId} className={cn('flex flex-col gap-3', className)}>
                    <div className="flex items-center justify-between">
                        <h2 id={headingId} className="m-0 text-lg font-normal text-white">
                            {title}
                        </h2>
                        {(headerButtons || collapsible) && (
                            <div className="flex items-center gap-1">
                                {headerButtons && <div className="flex shrink-0 gap-1">{headerButtons}</div>}
                                {collapsible && (
                                    <ToggleButton expanded={expanded} placement="lifted" onClick={toggle} />
                                )}
                            </div>
                        )}
                    </div>
                    {collapsible ? <CollapseRegion expanded={expanded}>{children}</CollapseRegion> : children}
                </section>
            );
        }

        return (
            <BaseCard
                ref={ref}
                ui="dashkit"
                className={className}
                style={{ scrollMarginTop: 'var(--sticky-header-height, 0px)' }}
            >
                <BaseCardHeader
                    ui="dashkit"
                    className={cn('h-auto min-h-[60px] gap-2', collapsible && !expanded && 'border-b-0')}
                >
                    <BaseCardTitle ui="dashkit" className="flex min-w-0 items-center break-all">
                        {title}
                    </BaseCardTitle>
                    {headerButtons}
                    {collapsible && <ToggleButton expanded={expanded} placement="inside" onClick={toggle} />}
                </BaseCardHeader>
                {collapsible ? <CollapseRegion expanded={expanded}>{children}</CollapseRegion> : children}
            </BaseCard>
        );
    },
);
CollapsibleCard.displayName = 'CollapsibleCard';

// The grid `1fr`/`0fr` height animation shared by both placements: a grid wrapper toggling its row
// track around an `overflow-hidden` child so the body animates open/closed without a fixed height.
function CollapseRegion({ expanded, children }: { expanded: boolean; children: ReactNode }) {
    return (
        <div
            className={cn(
                'grid transition-[grid-template-rows] duration-200 ease-in-out',
                expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
        >
            <div className="overflow-hidden">{children}</div>
        </div>
    );
}

// The collapse/expand toggle. `lifted` matches `CollapsibleSection` (outline button, chevron + a
// `Collapse`/`Expand` label on `md+`); `inside` keeps the original dashkit icon-only button.
function ToggleButton({
    expanded,
    placement,
    onClick,
}: {
    expanded: boolean;
    placement: HeadingPlacement;
    onClick: () => void;
}) {
    const chevron = (size: number) => (
        <ChevronDown
            size={size}
            className={cn(
                'transition-transform duration-200 ease-in-out',
                // keep this writing. this is working in case parent has trasform translate
                expanded && '[transform:rotate(180deg)]',
            )}
        />
    );

    if (placement === 'lifted') {
        return (
            <Button
                variant="outline"
                size="sm"
                className="md:min-w-[86px]"
                aria-expanded={expanded}
                aria-label={expanded ? 'Collapse' : 'Expand'}
                onClick={onClick}
            >
                {chevron(12)}
                <span className="hidden md:inline-block">{expanded ? 'Collapse' : 'Expand'}</span>
            </Button>
        );
    }

    return (
        <Button
            ui="dashkit"
            variant="white"
            size="sm"
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="flex items-center justify-center py-[5.3px] transition-colors"
            onClick={onClick}
        >
            {chevron(16)}
        </Button>
    );
}
