'use client';

// Vendored copy of app/shared/ui/navigation-tabs/ui/TabLink.tsx with a `disabled` state added:
// a disabled tab renders as a dimmed, non-interactive <span> (no link, no scroll handler). Context,
// styling and the active/inactive behaviour otherwise mirror the app original.
import Link from 'next/link';
import React from 'react';

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
    className,
    disabled,
}: {
    path: string;
    title: string;
    className?: string;
    disabled?: boolean;
}) {
    const ctx = useNavigationTabsContext();
    const isActive = path === ctx.activeValue;

    if (disabled) {
        return (
            <span
                role="tab"
                aria-disabled="true"
                data-state="inactive"
                className={cn(tabLinkClassName, 'cursor-not-allowed text-outer-space-500 opacity-60', className)}
            >
                {title}
            </span>
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
            {title}
        </Link>
    );
}
