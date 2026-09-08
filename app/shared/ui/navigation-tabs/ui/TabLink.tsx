'use client';

import Link from 'next/link';
import React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/shared/ui/tooltip';
import { cn } from '@/app/components/shared/utils';
import { useNavigationTabsContext } from '@/app/shared/ui/navigation-tabs/model/navigation-tabs-context';

export const tabLinkClassName = cn(
    'appearance-none border-solid shadow-none outline-none',
    'border-b border-transparent data-[state=active]:border-b-accent',
    'bg-transparent',
    'px-0 py-4',
    'shrink-0 whitespace-nowrap',
    'text-sm font-normal text-outer-space-200 data-[state=active]:text-white',
    'no-underline',
);

export function TabLink({
    path,
    title,
    badge,
    className,
    disabled,
    disabledHint,
}: {
    path: string;
    title: string;
    /** Decorative marker shown before the title (e.g. the inspector's simulation "S" chip). */
    badge?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    // Tooltip shown on hover over a disabled tab (e.g. "run a simulation to load this tab").
    disabledHint?: React.ReactNode;
}) {
    const ctx = useNavigationTabsContext();
    const isActive = path === ctx.activeValue;
    // Without a badge the label stays a bare string, so existing tabs keep their exact markup. With one,
    // the badge is an inline `align-middle` box rather than a flex item: an `inline-flex` wrapper would
    // take ITS baseline from the badge (the first flex item), nudging the title a pixel off the baseline
    // every other tab sits on. Inline keeps the title in the link's own line box, unmoved.
    const label = badge ? (
        <>
            <span className="relative -top-0.5 mr-1 inline-block align-middle">{badge}</span>
            {title}
        </>
    ) : (
        title
    );

    if (disabled) {
        const span = (
            <span
                role="tab"
                aria-disabled="true"
                data-state="inactive"
                className={cn(tabLinkClassName, 'cursor-not-allowed text-outer-space-500 opacity-60', className)}
            >
                {label}
            </span>
        );
        if (!disabledHint) return span;
        return (
            <Tooltip>
                <TooltipTrigger asChild>{span}</TooltipTrigger>
                <TooltipContent side="bottom">{disabledHint}</TooltipContent>
            </Tooltip>
        );
    }

    const { onTabClick } = ctx;
    const handleClick = onTabClick
        ? (e: React.MouseEvent<HTMLAnchorElement>) => {
              e.preventDefault();
              onTabClick(path, e);
          }
        : undefined;
    return (
        <Link
            href={ctx.buildHref(path)}
            scroll={false}
            role="tab"
            aria-selected={isActive}
            data-state={isActive ? 'active' : 'inactive'}
            className={cn(tabLinkClassName, className)}
            onClick={handleClick}
        >
            {label}
        </Link>
    );
}
