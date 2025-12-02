'use client';

import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import { useSelectedLayoutSegment } from 'next/navigation';
import React from 'react';
import { cn } from '../utils';

export type NavigationTabConfig = {
    path: string;
    title: string;
    slug?: string;
    component?: React.ReactNode;
};

type NavigationTabsProps = {
    baseUrl: string;
    tabs: NavigationTabConfig[];
    className?: string;
};

export function NavigationTabs({ baseUrl, tabs, className }: NavigationTabsProps) {
    return (
        <ul className={cn('nav nav-tabs nav-overflow header-tabs', className)}>
            {tabs.map(tab => {
                const key = tab.slug || tab.path;

                if (tab.component) {
                    return <React.Fragment key={key}>{tab.component}</React.Fragment>;
                }

                return (
                    <React.Fragment key={key}>
                        <NavigationTabItem baseUrl={baseUrl} tab={tab} />
                    </React.Fragment>
                );
            })}
        </ul>
    );
}

function NavigationTabItem({ baseUrl, tab }: { baseUrl: string; tab: NavigationTabConfig }) {
    const tabPath = useClusterPath({ pathname: `${baseUrl}/${tab.path}` });
    const selectedLayoutSegment = useSelectedLayoutSegment();
    const isActive = (selectedLayoutSegment === null && tab.path === '') || selectedLayoutSegment === tab.path;

    return (
        <li className="nav-item">
            <Link className={`${isActive ? 'active ' : ''}nav-link`} href={tabPath} scroll={false}>
                {tab.title}
            </Link>
        </li>
    );
}
