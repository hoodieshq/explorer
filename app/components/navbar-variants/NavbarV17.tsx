'use client';

import { cn } from '@components/shared/utils';
import React, { useState } from 'react';

import { ClusterDropdown } from './ClusterDropdown';
import { MorphSearch } from './MorphSearch';
import { NavLinks, NavMenu } from './NavGroup';
import { BAR_CLASSES, BrandLockup, GUTTER_CLASSES, useNavRoutes } from './shared';
import type { INavbarProps } from './types';

/**
 * Variant 3.3 — v3.2 with the network control saying its two facts out loud instead of in small caps.
 * The provenance mark leads the network's name, since it qualifies what that name refers to and reading
 * it afterwards is reading it too late; underneath, the connection's mark and its state written as a
 * phrase — CONNECTED, NOT CONNECTED — rather than as a caption. Everything else is v3.2's: the same
 * layout, the same aurora, the same graded rule.
 *
 * The phrase needs a wider control, and the rest insets below sm are computed from that width, so the two
 * move together: 130 at xs is what the 343px row can spare once the wordmark, the lens and the menu have
 * taken theirs, and the square parks against it rather than over it.
 */
export function NavbarV17({ children }: INavbarProps) {
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
            {/* Three columns from lg, the outer two sharing the leftover evenly, which is what puts the
                middle one on the screen's centre line rather than merely between its neighbours.
                Which it only manages once there is room to spare. The middle is capped at 720 and a grid
                column will not shrink below its content, so the field takes its width first and the two
                sides get what is left: on a narrow laptop the block sits off centre, pushed by a link row
                far wider than the wordmark, and only on a screen wide enough for both sides to reach the
                same width does it settle on the centre line. Stretch first, centre after — and the same
                rule is why the block can never run under the links.
                The wordmark's column has a floor of its own 112px. Its lockup carries `min-w-0`, which
                takes away the automatic minimum a grid column would otherwise get from its content, and
                without the floor the field would go on growing and squeeze the wordmark into its clip.
                From lg and not from md: below that the destinations are behind the burger, and centring a
                block against a lone 38px button is centring it against nothing. Below lg the row is the
                flex arrangement the collapsing square needs, and the middle group is `contents` there so
                it adds no box of its own. */}
            <div
                className={cn(
                    'relative flex items-center gap-1.5 xs:gap-2',
                    'lg:grid lg:grid-cols-[minmax(112px,1fr)_minmax(0,720px)_1fr] lg:gap-4',
                    GUTTER_CLASSES,
                )}
            >
                <BrandLockup />

                <div className="contents lg:flex lg:min-w-0 lg:items-center lg:gap-2">
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
                        // The auto margin holds the field against the controls while the row is a flex line;
                        // from md the middle column is what sets its place, and the cap is the column's.
                        dockClassName="sm:ml-auto sm:max-w-[720px] lg:ml-0 lg:max-w-none"
                        restClassName="left-[calc(100%-184px)] right-[146px] xs:left-[calc(100%-238px)] xs:right-[200px]"
                    >
                        {children}
                    </MorphSearch>

                    {/* Below sm: the search square's slot, the network, the menu — 112 + 6 + 38 + 6 + 80 + 6 + 38
                    = 286 in the 289px row at 320. `ml-auto` is that row's, where the square is out of flow;
                    from sm the block's own auto margin has already pushed everything to the edge. */}
                    <div className="ml-auto flex shrink-0 items-center gap-1.5 xs:gap-2 sm:ml-0">
                        <span aria-hidden className="block h-[38px] w-[38px] sm:hidden" />
                        <ClusterDropdown
                            shape="stacked-lead"
                            align="end"
                            open={clusterOpened}
                            onOpenChange={onClusterOpenChange}
                            className="w-[80px] xs:w-[130px] sm:w-[142px] md:w-[170px]"
                        />
                    </div>
                </div>

                {/* Only ever one of these is on screen, so exactly one takes the third column. */}
                <NavLinks routes={routes} className="hidden lg:flex lg:justify-self-end" />
                <NavMenu routes={routes} open={menuOpened} onOpenChange={onMenuOpenChange} className="lg:hidden" />
            </div>
        </nav>
    );
}
