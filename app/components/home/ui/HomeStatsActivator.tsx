'use client';

import { useCluster } from '@providers/cluster';
import { useStatsProvider } from '@providers/stats/solanaClusterStats';
import useTabVisibility from '@utils/use-tab-visibility';
import React from 'react';

// Renders nothing; owns the single setActive(true) that starts cluster-stats polling for the homepage,
// independent of which stat cards render. Re-activates when the cluster changes.
export function HomeStatsActivator() {
    const { setActive } = useStatsProvider();
    const { cluster } = useCluster();
    const { visible } = useTabVisibility();

    React.useEffect(() => {
        setActive(true);
        return () => setActive(false);
    }, [setActive, cluster]);

    // A fetch that fails while the tab is backgrounded flips the provider to inactive; re-arm it whenever
    // the tab comes back so the stats recover on the next poll instead of staying stuck on "Unavailable".
    React.useEffect(() => {
        if (visible) setActive(true);
    }, [visible, setActive]);

    return undefined;
}
