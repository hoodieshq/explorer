'use client';

import { useCluster } from '@providers/cluster';
import { useStatsProvider } from '@providers/stats/solanaClusterStats';
import React from 'react';

// Renders nothing; owns the single setActive(true) that starts cluster-stats polling for the homepage,
// independent of which stat cards render. Re-activates when the cluster changes.
export function HomeStatsActivator() {
    const { setActive } = useStatsProvider();
    const { cluster } = useCluster();

    React.useEffect(() => {
        setActive(true);
        return () => setActive(false);
    }, [setActive, cluster]);

    return undefined;
}
