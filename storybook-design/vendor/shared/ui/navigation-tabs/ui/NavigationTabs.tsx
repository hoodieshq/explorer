'use client';

import { useSelectedLayoutSegment } from 'next/navigation';
import React from 'react';

import { type NavigationTab } from '@/app/shared/ui/navigation-tabs/model/types';

import { BaseNavigationTabs } from './BaseNavigationTabs';

type NavigationTabsProps = {
    buildHref: (path: string) => string;
    children?: React.ReactNode;
    className?: string;
    tabs: NavigationTab[];
};

export function NavigationTabs({ buildHref, tabs, children, className }: NavigationTabsProps) {
    const segment = useSelectedLayoutSegment();
    const activeValue = segment ?? '';

    return (
        <BaseNavigationTabs tabs={tabs} activeValue={activeValue} buildHref={buildHref} className={className}>
            {children}
        </BaseNavigationTabs>
    );
}
