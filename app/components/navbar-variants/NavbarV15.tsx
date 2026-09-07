'use client';

import { cn } from '@components/shared/utils';
import React, { useRef, useState } from 'react';

import { AuroraBehind } from './AuroraBehind';
import { ClusterDropdown } from './ClusterDropdown';
import { MorphSearch } from './MorphSearch';
import { NavLinks, NavMenu } from './NavGroup';
import { BAR_CLASSES, BrandLockup, GUTTER_CLASSES, useNavRoutes } from './shared';
import type { INavbarProps } from './types';

/**
 * Variant 5.2 — v5.1 with the aurora moved outside. Same bar, same block of search and network, same lit
 * rule on focus; what changes is where the light is. In 5.1 it lies along the inside of the field's foot,
 * under the text; here it stands behind the field and shows above and below it.
 *
 * One sheet of light, not two edges: the same coordinate along the bar drives what shows above the frame
 * and what shows below it, so a flare is one flare seen at both ends of the thing covering its middle.
 * The short sides stay dark. It cannot live inside the frame — that box clips its overflow to keep its
 * corners and its morph tidy — so it is a sibling in the row that measures the frame each frame and
 * places itself behind it. See `AuroraBehind`. `focusGlow="halo"` keeps the lit rule and skips the band.
 */
export function NavbarV15({ children }: INavbarProps) {
    const [searchOpened, setSearchOpened] = useState(false);
    const [clusterOpened, setClusterOpened] = useState(false);
    const [menuOpened, setMenuOpened] = useState(false);
    const routes = useNavRoutes();
    const frameRef = useRef<HTMLDivElement>(null);
    const [searchFocused, setSearchFocused] = useState(false);

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
                    focusGlow="halo"
                    frameRef={frameRef}
                    onFocusChange={setSearchFocused}
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

                {/* 12px of spill: the navbar's own vertical padding, so the light reaches the bar's top and
                    bottom edges and stops there. */}
                <AuroraBehind active={searchFocused} spill={12} targetRef={frameRef} />

                <span aria-hidden className="block h-[38px] flex-1 sm:hidden" />

                {/* No auto margins here: below sm the spacer above is `flex-1` and takes the slack, and from
                    sm the block's own `ml-auto` has already pushed these to the edge. */}
                <NavLinks routes={routes} className="hidden lg:flex" />
                <NavMenu routes={routes} open={menuOpened} onOpenChange={onMenuOpenChange} className="lg:hidden" />
            </div>
        </nav>
    );
}
