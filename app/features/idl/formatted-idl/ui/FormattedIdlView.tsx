import { Idl } from '@coral-xyz/anchor';
import classNames from 'classnames';
import { RootNode } from 'codama';
import { useAtomValue, useSetAtom } from 'jotai';
import { useEffect, useState } from 'react';

// import { originalIdlAtom } from '../model/original-idl';
// import { programIdAtom } from '../model/program-id';
import { FormattedIdl } from '@/app/components/account/idl/formatted-idl/formatters/FormattedIdl';

import { useTabs } from '../model/use-tabs';

type FormattedIdlViewProps<T> = {
    idl: FormattedIdl | null;
    originalIdl: T;
    programId: string;
    withInteractive?: boolean;
};

/**
 *
 * @param withInteractive Enables tab that allows excuting commands
 * @returns
 */
export function FormattedIdlView({
    idl,
    originalIdl,
    programId,
    withInteractive = false,
}: FormattedIdlViewProps<Idl> | FormattedIdlViewProps<RootNode>) {
    const [activeTabIndex, setActiveTabIndex] = useState<number | null>(null);
    const tabs = useTabs(idl, originalIdl, programId, withInteractive);

    useEffect(() => {
        if (typeof activeTabIndex === 'number') return;
        setActiveTabIndex(tabs.findIndex(tab => !tab.disabled));
    }, [tabs, activeTabIndex]);

    if (!tabs || activeTabIndex === null || !idl) return null;

    const activeTab = tabs[activeTabIndex];

    const TabComponent = activeTab.Component;

    return (
        <div className="idl-view">
            <div className="nav nav-tabs mb-5">
                {tabs.map((tab, index) => (
                    <button
                        key={tab.title}
                        className={classNames('nav-item nav-link', {
                            active: index === activeTabIndex,
                            'opacity-50': tab.disabled,
                        })}
                        disabled={tab.disabled}
                        onClick={() => setActiveTabIndex(index)}
                    >
                        {tab.title}
                    </button>
                ))}
            </div>
            {/*<div className="table-responsive mb-0 e-min-h-[200px]">{activeTab.component}</div>*/}
            <div className="table-responsive mb-0 e-min-h-[200px]">
                <TabComponent {...activeTab.props} />
            </div>
        </div>
    );
}
