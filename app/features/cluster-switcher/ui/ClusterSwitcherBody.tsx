'use client';

import { cn } from '@components/shared/utils';
import { useCluster } from '@entities/cluster';
import { Cluster, clusterName, CLUSTERS, clusterSlug } from '@utils/cluster';
import { useAtomValue } from 'jotai';
import dynamic from 'next/dynamic';
import Link from 'next/link';

// The slice's own model, so relative imports rather than its public `index.ts`, which would be a cycle.
import { savedClustersAtom } from '../lib/cluster-storage';
import { useClusterHref } from '../model/use-cluster-href';
import { clusterButtonVariants } from './cluster-button-variants';
import { CustomClusterField } from './CustomClusterField';
import { SavedClusterList } from './SavedClusterList';

const ClusterModalDeveloperSettings = dynamic(
    () => import('./ClusterModalDeveloperSettings').then(m => m.ClusterModalDeveloperSettings),
    { ssr: false },
);

/**
 * Everything the switcher offers: the heading, the cluster pills, the custom-endpoint field, the saved
 * list and the developer settings.
 *
 * Extracted from `ClusterModal` so the slide-over panel and the in-place popover a navbar design variant
 * uses are the same controls rather than two implementations. The custom-endpoint field alone carries URL
 * parsing, the whitelist check and the consent handshake — reimplementing that for a second surface is
 * how the two would quietly disagree.
 *
 * `className` is the caller's spacing: the panel needs a top margin to clear its close button, a popover
 * does not.
 */
export function ClusterSwitcherBody({ className }: { className?: string }) {
    return (
        <div className={className}>
            <h2 className="mb-6 text-left">Choose a Cluster</h2>
            <ClusterToggle />
            <ClusterModalDeveloperSettings />
        </div>
    );
}

// The saved list is read once here and passed down, so its two consumers share one subscription and stay
// on the same value within a render.
function ClusterToggle() {
    const { status, cluster } = useCluster();
    const savedClusters = useAtomValue(savedClustersAtom);
    const buildHref = useClusterHref();

    return (
        <div className="mb-6 flex flex-wrap">
            {CLUSTERS.map(net => {
                const active = net === cluster;
                if (net === Cluster.Custom)
                    return (
                        <CustomClusterField
                            key={clusterSlug(net)}
                            status={status}
                            active={active}
                            savedClusters={savedClusters}
                        />
                    );

                return (
                    <Link
                        key={clusterSlug(net)}
                        className={cn(clusterButtonVariants({ active, status }), 'mb-3')}
                        href={buildHref({ cluster: net })}
                    >
                        {clusterName(net)}
                    </Link>
                );
            })}
            <SavedClusterList status={status} savedClusters={savedClusters} />
        </div>
    );
}
