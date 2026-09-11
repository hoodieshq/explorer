'use client';

import { cn } from '@components/shared/utils';
import React, { useRef, useState } from 'react';

import { ClusterDropdown } from './ClusterDropdown';
import { MorphSearch } from './MorphSearch';
import { NavLinks, NavMenu } from './NavGroup';
import { BAR_CLASSES, BrandLockup, GUTTER_CLASSES, useNavRoutes } from './shared';
import type { INavbarProps } from './types';

/**
 * Variant 4.1 — the borderless bar with the field put away. The row at the right end reads, from lg: Feature Gates ·
 * Inspector · repo · | · 🔍 · ● Mainnet Beta ▾ — the destinations, a hairline, then *find* and *where* as
 * one group; below lg the group alone, lens · network tag · menu. The field is never shown outright:
 * tapping the lens stretches it across the whole bar — gutter to gutter, over the brand and the row alike
 * — with the cross at its right end folding it back. The bar at rest is brand, links, a hairline, lens,
 * network: text on a ground and nothing else, since the one framed thing (the field) is only there while
 * it is wanted.
 *
 * Every control is a glyph or text on the bar's ground, at every width — no outlines, no fills, a hover
 * ground only, hairlines between them: links · | · 🔍 · | · ● network from lg, and 🔍 · | · ● network · | ·
 * ≡ below. The field's frame appears with the field. The hairlines and the network are siblings of the
 * link row rather than items in it, so one spacer serves both layouts and the lens's rest position is
 * measured from it (`slotRef`), the link row's text width not being something to hard-code.
 */
export function NavbarV12({ children }: INavbarProps) {
    const [searchOpened, setSearchOpened] = useState(false);
    const [clusterOpened, setClusterOpened] = useState(false);
    const [menuOpened, setMenuOpened] = useState(false);
    const routes = useNavRoutes();
    const slotRef = useRef<HTMLSpanElement>(null);

    // One thing open at a time.
    const onSearchOpenChange = (open: boolean) => {
        if (open) {
            setMenuOpened(false);
            setClusterOpened(false);
        }
        setSearchOpened(open);
    };
    const onClusterOpenChange = (open: boolean) => {
        if (open) {
            setMenuOpened(false);
            setSearchOpened(false);
        }
        setClusterOpened(open);
    };
    const onMenuOpenChange = (open: boolean) => {
        if (open) {
            setClusterOpened(false);
            setSearchOpened(false);
        }
        setMenuOpened(open);
    };

    return (
        <nav className={cn('py-3', BAR_CLASSES)}>
            <div className={cn('relative flex items-center gap-1.5 xs:gap-2', GUTTER_CLASSES)}>
                <BrandLockup />

                {/* Never docked: the lens at rest over its spacer at every width, measured; the field across
                    the bar when open. `quiet`: a glyph among text, the frame only once it is a field. */}
                <MorphSearch
                    dockFrom="none"
                    quiet
                    open={searchOpened}
                    onOpenChange={onSearchOpenChange}
                    slotRef={slotRef}
                >
                    {children}
                </MorphSearch>

                {/* Below lg the row is [slot] · | · network · | · menu. The hairlines are flex items too, so
                    each costs a pixel and two gaps: at 320 (289px box, 6px gaps) that leaves 289 − 112 − 6 −
                    38 − (6 + 1 + 6) − (6 + 1 + 6) − 38 = 69 for the network, 113 at 375 with 8px gaps, ample
                    from sm. The label truncates. From lg: links · | · [slot] · | · network. */}
                <div className="ml-auto flex shrink-0 items-center gap-1.5 xs:gap-2">
                    <NavLinks routes={routes} className="hidden lg:flex" />
                    <span aria-hidden className="hidden h-4 w-px bg-outer-space-700 lg:mx-1 lg:block" />

                    <span ref={slotRef} aria-hidden className="block h-[38px] w-[38px]" />

                    <span aria-hidden className="h-4 w-px shrink-0 bg-outer-space-700 lg:mx-1" />
                    <ClusterDropdown
                        shape="text"
                        align="end"
                        open={clusterOpened}
                        onOpenChange={onClusterOpenChange}
                        className="max-w-[68px] xs:max-w-[112px] sm:max-w-[170px] lg:max-w-[240px]"
                    />

                    <span aria-hidden className="h-4 w-px shrink-0 bg-outer-space-700 lg:hidden" />
                    <NavMenu
                        quiet
                        routes={routes}
                        open={menuOpened}
                        onOpenChange={onMenuOpenChange}
                        className="lg:hidden"
                    />
                </div>
            </div>
        </nav>
    );
}
