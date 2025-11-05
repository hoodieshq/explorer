import { useAnchorProgram } from '@entities/idl/model/use-anchor-program';
import { useProgramMetadataIdl } from '@entities/program-metadata';
import { IdlBadge } from '@features/idl/ui/IdlBadge';
import { useCluster } from '@providers/cluster';
import classNames from 'classnames';
import { useEffect, useMemo, useState } from 'react';

import { IdlSection } from './IdlSection';

type IdlVariant = 'program-metadata' | 'anchor';
type IdlTab = {
    id: IdlVariant;
    idl: any;
    title: string;
    badge: string;
};

export function IdlCard({ programId }: { programId: string }) {
    const { url, cluster } = useCluster();
    const { idl } = useAnchorProgram(programId, url, cluster);
    const { programMetadataIdl } = useProgramMetadataIdl(programId, url, cluster);
    const [activeTabIndex, setActiveTabIndex] = useState<number>();

    const tabs = useMemo<IdlTab[]>(() => {
        return [
            {
                badge: 'Program Metadata IDL',
                id: 'program-metadata',
                idl: programMetadataIdl,
                title: 'Program Metadata',
            },
            {
                badge: 'Anchor IDL',
                id: 'anchor',
                idl: idl,
                title: 'Anchor',
            },
        ];
    }, [idl, programMetadataIdl]);

    useEffect(() => {
        // wait until both data are ready and then activate first available in the array
        if (tabs.every(tab => tab.idl !== undefined)) {
            setActiveTabIndex(tabs.findIndex(tab => tab.idl));
        }
    }, [tabs]);

    if ((!idl && !programMetadataIdl) || activeTabIndex == undefined) {
        return null;
    }

    const activeTab = tabs[activeTabIndex];
    return (
        <div className="card">
            <div className="card-header">
                <div className="nav nav-tabs" role="tablist">
                    {tabs
                        .filter(tab => tab.idl)
                        .map((tab, i) => (
                            <button
                                key={tab.title}
                                className={classNames('nav-item nav-link', {
                                    active: tab.id === activeTab?.id,
                                })}
                                onClick={() => setActiveTabIndex(i)}
                            >
                                {tab.title}
                            </button>
                        ))}
                </div>
            </div>
            <div className="card-body">
                <IdlSection
                    badge={<IdlBadge title={activeTab.badge} idl={activeTab.idl} />}
                    idl={activeTab.idl}
                    programId={programId}
                />
            </div>
        </div>
    );
}
