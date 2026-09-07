'use client';

import { cn } from '@components/shared/utils';
import React, { useState } from 'react';

import { ClusterDropdown } from './ClusterDropdown';
import { MorphSearch } from './MorphSearch';
import { NavLinks, NavMenu } from './NavGroup';
import { BAR_CLASSES, BrandLockup, GUTTER_CLASSES, useNavRoutes } from './shared';
import type { INavbarProps } from './types';

/**
 * Variant 5.1 — search and the network as one block, moved left, with the status spelled out. The bar reads brand · […
 * search … | ● Mainnet Beta / connected] · … · Feature Gates · Inspector · repo: one framed block holding
 * the field and, at its right end, the network; the destinations last, pushed to the far edge.
 *
 * The network belongs to the block because results depend on the cluster — the block is "search *this
 * network*" — and it says the connection in words: the name on one line, `connected` / `connecting` /
 * `not connected` under it in the caption's caps, the hue on that line rather than on a dot alone.
 * Nothing else on the bar is about the network, and nothing else is framed.
 *
 * From sm the block is simply there, stretching to whatever the row leaves, up to 640px. Past that width
 * the surplus goes to its left margin rather than into the block, so the block stays against the links at
 * the right end and the gap after the brand is what opens up as the screen grows. Below sm the frame at
 * rest is the lens square with the
 * network beside it — the name and its status stay visible — sized to those two and parked against the
 * menu, since a frame stretched across a row it has nothing to put in reads as a field that lost its
 * input. Tapping the lens stretches it across the row, the network riding its right edge, the input
 * appearing before it. See `MorphSearch`.
 */
export function NavbarV14({ children }: INavbarProps) {
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
                    open={searchOpened}
                    onOpenChange={onSearchOpenChange}
                    dockClassName="sm:ml-auto sm:max-w-[640px]"
                    restClassName="left-[calc(100%-186px)] right-[60px] xs:left-[calc(100%-236px)] xs:right-[62px]"
                    suffix={
                        // Fixed at every width, so the input's left edge never moves with the network name
                        // and, below sm, the rest frame has a width to be sized from. 144 from sm; below
                        // it, what that row can spare (see the insets above). The name truncates.
                        <ClusterDropdown
                            shape="suffix-stacked"
                            align="end"
                            open={clusterOpened}
                            onOpenChange={onClusterOpenChange}
                            className="w-[88px] shrink-0 xs:w-[136px] sm:w-[164px]"
                        />
                    }
                >
                    {children}
                </MorphSearch>

                <span aria-hidden className="block h-[38px] flex-1 sm:hidden" />

                {/* No auto margins here: below sm the spacer above is `flex-1` and takes the slack, and from
                    sm the block's own `ml-auto` has already pushed these to the edge. */}
                <NavLinks routes={routes} className="hidden lg:flex" />
                <NavMenu routes={routes} open={menuOpened} onOpenChange={onMenuOpenChange} className="lg:hidden" />
            </div>
        </nav>
    );
}
