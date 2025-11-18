import type { Idl } from '@coral-xyz/anchor';
import { cva } from 'class-variance-authority';
import type { RootNode } from 'codama';
import { useEffect, useState } from 'react';

import { useTabs } from '../../model/use-tabs';
import type { FormattedIdlViewProps } from './types';

const navButton = cva('nav-item nav-link', {
    defaultVariants: {
        disabled: false,
        state: 'default',
    },
    variants: {
        disabled: {
            false: '',
            true: 'e-opacity-50',
        },
        state: {
            active: 'active',
            default: '',
        },
    },
});

/**
 *
 * @param withInteractive Enables tab that allows excuting commands
 * @returns
 */
export function FormattedIdlView({
    idl,
    originalIdl,
    searchStr,
}: FormattedIdlViewProps<Idl> | FormattedIdlViewProps<RootNode>) {
    const [activeTabIndex, setActiveTabIndex] = useState<number | null>(null);

    const hasSearch = Boolean(searchStr?.trim());
    const tabs = useTabs(idl, originalIdl, hasSearch);

    // Initialize activeTabIndex with the first enabled tab when tabs load
    useEffect(() => {
        if (activeTabIndex !== null) return;
        const firstEnabledTabIndex = tabs.findIndex(tab => !tab.disabled);
        setActiveTabIndex(firstEnabledTabIndex);
    }, [tabs, activeTabIndex]);

    if (!tabs || activeTabIndex === null || !idl) return null;

    const activeTab = tabs[activeTabIndex];

    return (
        <div>
            <div className="nav nav-tabs e-mb-5">
                {tabs.map((tab, index) => (
                    <button
                        key={tab.id}
                        className={navButton({
                            disabled: tab.disabled,
                            state: index === activeTabIndex ? 'active' : 'default',
                        })}
                        disabled={tab.disabled}
                        onClick={() => setActiveTabIndex(index)}
                    >
                        {tab.title}
                    </button>
                ))}
            </div>
            <div className="e-overflow-x-auto md:e-overflow-x-scroll">
                <ActiveTab activeTab={activeTab} />
            </div>
        </div>
    );
}

const ActiveTab = ({ activeTab }: { activeTab: ReturnType<typeof useTabs>[0] }) => {
    return activeTab.render();
};
