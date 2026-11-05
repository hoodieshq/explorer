'use client';

import { cn } from '@components/shared/utils';
import { ClusterDropdown } from '@features/cluster-switcher';
import { cva } from 'class-variance-authority';
import React, { type ReactNode, useRef, useState } from 'react';

import { NavLinks, NavMenu } from './navbar/NavGroup';
import { NavSearch } from './navbar/NavSearch';
import { useNavSearchVariant } from './navbar/search-variant';
import { BAR_CLASSES, BrandLockup, GUTTER_CLASSES, useNavRoutes } from './navbar/shared';

export interface INavbarProps {
    children?: ReactNode;
}

export function Navbar({ children }: INavbarProps) {
    const [searchOpened, setSearchOpened] = useState(false);
    const [clusterOpened, setClusterOpened] = useState(false);
    const [menuOpened, setMenuOpened] = useState(false);
    const routes = useNavRoutes();
    const slotRef = useRef<HTMLSpanElement>(null);
    // REVIEW(HOO-935): with the `field` search the slot stretches over the room between the logo and the cluster
    // switcher, and the search field rests in it instead of the 38px button. At 375px that room is the button's
    // 38px, so the cluster switcher keeps its compact 80px width up to `sm` to give the field about 90px.
    const searchVariant = useNavSearchVariant();

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
            <div
                className={cn(
                    'relative flex items-center gap-1.5 xs:gap-2',
                    'lg:grid lg:grid-cols-[minmax(112px,1fr)_minmax(0,720px)_1fr] lg:gap-4',
                    GUTTER_CLASSES,
                )}
            >
                <BrandLockup />

                <div className="contents lg:flex lg:min-w-0 lg:items-center lg:gap-2">
                    <NavSearch
                        open={searchOpened}
                        onOpenChange={onSearchOpenChange}
                        dockClassName="sm:ml-auto sm:max-w-[720px] lg:ml-0 lg:max-w-none"
                        restClassName="left-[calc(100%-184px)] right-[146px] xs:left-[calc(100%-239px)] xs:right-[201px]"
                        slotRef={slotRef}
                    >
                        {children}
                    </NavSearch>

                    <div className={searchGroupVariants({ search: searchVariant })}>
                        <span ref={slotRef} aria-hidden className={searchSlotVariants({ search: searchVariant })} />
                        <ClusterDropdown
                            align="end"
                            open={clusterOpened}
                            onOpenChange={onClusterOpenChange}
                            className={clusterVariants({ search: searchVariant })}
                        />
                    </div>
                </div>

                <NavLinks routes={routes} className="hidden lg:flex lg:justify-self-end" />
                <NavMenu
                    routes={routes}
                    filled
                    open={menuOpened}
                    onOpenChange={onMenuOpenChange}
                    className="lg:hidden"
                />
            </div>
        </nav>
    );
}

const searchGroupVariants = cva('ml-auto flex items-center gap-1.5 xs:gap-2 sm:ml-0', {
    variants: { search: { button: 'shrink-0', field: 'min-w-0 flex-1 sm:flex-none sm:shrink-0' } },
});

const searchSlotVariants = cva('block h-[38px] sm:hidden', {
    variants: { search: { button: 'w-[38px]', field: 'min-w-0 flex-1' } },
});

const clusterVariants = cva('sm:w-[142px] md:w-[170px]', {
    variants: { search: { button: 'w-[80px] xs:w-[131px]', field: 'w-[80px]' } },
});
