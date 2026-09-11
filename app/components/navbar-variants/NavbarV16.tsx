'use client';

import { cn } from '@components/shared/utils';
import React, { useState } from 'react';

import { ClusterDropdown } from './ClusterDropdown';
import { MorphSearch } from './MorphSearch';
import { NavLinks, NavMenu } from './NavGroup';
import { BAR_CLASSES, BrandLockup, GUTTER_CLASSES, useNavRoutes } from './shared';
import type { INavbarProps } from './types';

/**
 * Variant 3.2 — v5.1's behaviour with v3.1's arrangement: the aurora at the foot of the field and the
 * graded rule that comes with it, but the network standing on its own rather than sharing the field's
 * frame. The two exist to answer one question — whether the cluster reads better as the field's scope or
 * as a control beside it — so everything else about them is held identical on purpose: the same docking
 * width, the same 640 cap and auto margin, the same focus treatment.
 *
 * The one thing that has to differ below sm is the arithmetic. With the network out of the frame the rest
 * row is the familiar lens · network · menu, so the square parks over a 38px slot and the insets are the
 * ones every variant with that row uses.
 */
export function NavbarV16({ children }: INavbarProps) {
    const [searchOpened, setSearchOpened] = useState(false);
    const [clusterOpened, setClusterOpened] = useState(false);
    const [menuOpened, setMenuOpened] = useState(false);
    const routes = useNavRoutes();

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

                {/* Below sm the frame is its contents wide and no wider: `right` parks it beside the menu
                    (gutter 16 + menu 38 + gap 6 / 8 = 60 / 62) and `left` is the row less that and the
                    frame's own width — lens 38 + the network's fixed 88 / 136 — so both insets stay
                    numbers and the open/close motion still animates (an `auto` edge would snap). The
                    widths are what the row can spare at rest: 289 − brand 112 − 2 gaps − menu 38 leaves
                    127 at 320, and 343 − 112 − 16 − 38 leaves 177 at 375.
                    From sm it is in flow: `flex-1` up to 640, then `ml-auto` — an auto margin takes what is
                    left over *after* the grow, so the surplus lands to the left of the block instead of
                    stretching it, holding the block against the links at the right end. It has to be the
                    row's only auto margin, or the others would split the surplus and centre the block. */}
                <MorphSearch
                    dockFrom="sm"
                    focusGlow="underline"
                    // Finer light than v5.1's and half as strong overall, with the very edge kept three
                    // times the rest of the band rather than half again: four times the cells across the
                    // field, and a blur cut to a single pixel, which is about as far as it can go — the
                    // overhang below the field is what keeps that pixel from being clipped.
                    aurora={{ blur: 1, density: 26.4, edgeBoost: 2, intensity: 0.5 }}
                    open={searchOpened}
                    onOpenChange={onSearchOpenChange}
                    dockClassName="sm:ml-auto sm:max-w-[560px]"
                    restClassName="left-[calc(100%-184px)] right-[146px] xs:left-[calc(100%-228px)] xs:right-[190px]"
                >
                    {children}
                </MorphSearch>

                {/* Below sm: the search square's slot, the network, the menu — 112 + 6 + 38 + 6 + 80 + 6 + 38
                    = 286 in the 289px row at 320. `ml-auto` is that row's, where the square is out of flow;
                    from sm the block's own auto margin has already pushed everything to the edge. */}
                <div className="ml-auto flex shrink-0 items-center gap-1.5 xs:gap-2 sm:ml-0">
                    <span aria-hidden className="block h-[38px] w-[38px] sm:hidden" />
                    <ClusterDropdown
                        shape="stacked"
                        align="end"
                        open={clusterOpened}
                        onOpenChange={onClusterOpenChange}
                        className="w-[80px] xs:w-[120px] sm:w-[170px]"
                    />
                </div>

                <NavLinks routes={routes} className="hidden lg:flex" />
                <NavMenu routes={routes} open={menuOpened} onOpenChange={onMenuOpenChange} className="lg:hidden" />
            </div>
        </nav>
    );
}
