'use client';

import React, { useRef } from 'react';

import { cn } from '@/app/components/shared/utils';

import { useStickyHeaderHeight } from './useStickyHeaderHeight';

type Props = {
    children: React.ReactNode;
    className?: string;
};

/**
 * Sticky, full-bleed bar for a page's primary tab navigation (the address and block page tabs).
 * Stretches its background edge-to-edge, keeps the tabs on the page's content column, and draws the
 * section underline. Also publishes its height to `--sticky-header-height` (via `useStickyHeaderHeight`)
 * so anchored content below can clear the bar.
 *
 * ── HOW TO EMBED IT (important) ──────────────────────────────────────────────────────────────────
 * Render `StickyHeader` as a DIRECT CHILD of the page's content column — the same max-width/padding
 * wrapper that holds the page body (dashkit `PageContainer`, the DSCOMMON content column, …). Do NOT
 * wrap the tabs in another column container inside it, and do NOT place it at full page width.
 *
 * Why: the bar goes full-bleed with `ml/mr-[calc(50%-50vw)]` (stretch to the viewport edges) and then
 * pulls the tabs back with matching `pl/pr-[calc(50vw-50%)]`. Those `50%` values resolve against the
 * PARENT's width, so the pull-back only lines the tabs up with the body when the parent IS the content
 * column. Because it reads the parent's width, it adapts to whatever column system the page uses
 * without hardcoding a width — but placed anywhere else the tabs will not align with the content below
 * (and a nested column wrapper would double-constrain them).
 *
 *     <PageContentColumn>
 *         <StickyHeader>
 *             <NavigationTabs … />   // tabs only — no inner column wrapper
 *         </StickyHeader>
 *         … page body …
 *     </PageContentColumn>
 *
 * Underline: the `border-b` is full-bleed into the page margins on mobile/tablet (border on the
 * full-bleed wrapper) and clipped to the content column at `lg` (border moves to the inner column
 * wrapper). Spacing below the bar is the caller's — pass it via `className` (e.g. `mb-8`); the
 * component adds none of its own.
 */
export function StickyHeader({ children, className }: Props) {
    const headerRef = useRef<HTMLDivElement>(null);
    useStickyHeaderHeight(headerRef);

    return (
        <div
            ref={headerRef}
            className={cn(
                'sticky top-0 z-10 ml-[calc(50%-50vw)] mr-[calc(50%-50vw)] overflow-x-auto border-0 border-b border-solid border-neutral-800 bg-heavy-metal-900 pl-[calc(50vw-50%)] pr-[calc(50vw-50%)] [scrollbar-width:none] lg:border-b-0 [&::-webkit-scrollbar]:hidden',
                className,
            )}
        >
            {/* Desktop (`lg+`): the underline lives here, on the content-column wrapper, so it stops at
                the column edges instead of bleeding into the page margins. */}
            <div className="lg:border-0 lg:border-b lg:border-solid lg:border-neutral-800">{children}</div>
        </div>
    );
}
