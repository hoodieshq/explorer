'use client';

import { cn } from '@components/shared/utils';
import React, { useState } from 'react';

import { ClusterDropdown } from './ClusterDropdown';
import { MorphSearch } from './MorphSearch';
import { NavLinks, NavMenu } from './NavGroup';
import { BAR_CLASSES, BrandLockup, GUTTER_CLASSES, useNavRoutes } from './shared';
import type { INavbarProps } from './types';

/**
 * Variant 3.1 (file kept as `NavbarV10` — see the registry on why the numbering and the filenames are
 * allowed to differ) — the one about putting search behind a button on a phone.
 *
 * From md the bar has room and the field is simply there. Below md it is a 38px square with a lens, and
 * tapping it stretches that square across the row and folds it back (see `MorphSearch` for the motion),
 * so the narrow bar carries brand, network and menu at full size instead of surrendering half its width
 * to a field nobody is typing in yet. The network keeps its name and status throughout — nothing about
 * search is allowed to cost that.
 *
 * The field is capped at 480 and given the row's only auto margin, so once it has grown to that cap the
 * surplus lands to its left rather than stretching it: the field, the links and the network stay a group
 * at the right end, and what opens up as the screen widens is the space after the wordmark. It has to be
 * the only auto margin on the row, or the others would split the surplus and the group would drift back
 * towards the middle.
 */
export function NavbarV10({ children }: INavbarProps) {
    const [searchOpened, setSearchOpened] = useState(false);
    const [clusterOpened, setClusterOpened] = useState(false);
    const [menuOpened, setMenuOpened] = useState(false);
    const routes = useNavRoutes();

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

                {/* Docked from md and pushed right: `ml-auto` after a 480 cap, so it reads as a field held
                    against the group rather than one trailing the wordmark. */}
                <MorphSearch
                    dockFrom="md"
                    open={searchOpened}
                    onOpenChange={onSearchOpenChange}
                    dockClassName="md:ml-auto md:max-w-[480px]"
                    restClassName="left-[calc(100%-184px)] right-[146px] xs:left-[calc(100%-228px)] xs:right-[190px] sm:left-[calc(100%-258px)] sm:right-[220px]"
                >
                    {children}
                </MorphSearch>

                <NavLinks routes={routes} className="ml-2 hidden lg:flex" />

                {/* `ml-auto` is the below-md arrangement's, where the field is out of flow and something has
                    to hold the right edge; from md the field's own auto margin has already done it. */}
                <div className="ml-auto flex shrink-0 items-center gap-1.5 xs:gap-2 md:ml-0 lg:ml-2">
                    <span aria-hidden className="block h-[38px] w-[38px] md:hidden" />
                    <ClusterDropdown
                        shape="stacked"
                        align="end"
                        open={clusterOpened}
                        onOpenChange={onClusterOpenChange}
                        className="w-[80px] xs:w-[120px] sm:w-[170px]"
                    />
                    <NavMenu routes={routes} open={menuOpened} onOpenChange={onMenuOpenChange} className="lg:hidden" />
                </div>
            </div>
        </nav>
    );
}
