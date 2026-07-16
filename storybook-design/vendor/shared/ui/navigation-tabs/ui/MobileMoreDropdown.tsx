'use client';

import Link from 'next/link';
import React, { useState } from 'react';
import { ChevronDown } from 'react-feather';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';
import { cn } from '@/app/components/shared/utils';
import { useNavigationTabsContext } from '@/app/shared/ui/navigation-tabs/model/navigation-tabs-context';
import { type NavigationTab } from '@/app/shared/ui/navigation-tabs/model/types';

import { tabLinkClassName } from '@/app/shared/ui/navigation-tabs/ui/TabLink';

type MobileMoreDropdownProps = {
    tabs: NavigationTab[];
};

export function MobileMoreDropdown({ tabs }: MobileMoreDropdownProps) {
    const ctx = useNavigationTabsContext();
    const { onTabClick } = ctx;
    const [open, setOpen] = useState(false);
    const isActive = tabs.some(t => t.path === ctx.activeValue);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <div className="ml-auto flex items-center">
                <div className="mr-3 h-3/5 border-0 border-l border-solid border-neutral-700" />
                <PopoverTrigger
                    data-state={isActive ? 'active' : 'inactive'}
                    className={cn(tabLinkClassName, 'inline-flex cursor-pointer items-center gap-1')}
                >
                    More <ChevronDown size={12} />
                </PopoverTrigger>
            </div>
            <PopoverContent align="start" className="w-auto min-w-[8rem] p-1">
                {tabs.map(tab => {
                    // Mirror TabLink: in scroll-spy / onTabClick mode intercept and delegate;
                    // otherwise let the <Link> navigate on its own. Always close the popover.
                    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
                        if (onTabClick) {
                            e.preventDefault();
                            onTabClick(tab.path, e);
                        }
                        setOpen(false);
                    };
                    return (
                        <Link
                            key={tab.path}
                            href={ctx.buildHref(tab.path)}
                            scroll={false}
                            onClick={handleClick}
                            data-state={tab.path === ctx.activeValue ? 'active' : 'inactive'}
                            className={cn(
                                'block rounded px-3 py-2',
                                'text-sm no-underline',
                                'text-outer-space-200 data-[state=active]:text-accent',
                                'hover:bg-outer-space-800 hover:text-white',
                            )}
                        >
                            {tab.title}
                        </Link>
                    );
                })}
            </PopoverContent>
        </Popover>
    );
}
