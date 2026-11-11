'use client';

import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { Cluster, clusterName } from '@utils/cluster';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import { useMemo } from 'react';
import { List } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { useCluster } from '@/app/providers/cluster';
import { SectionLinkAction, useSectionActionsLayout } from '@/app/shared/ui/section-action';

import { filterUpcomingForCluster } from '../lib/filter-upcoming-features';
import { partitionFeatures, type UpcomingFeature } from '../lib/partition-features';
import { FeatureGateTable, OtherActivationsCell } from './FeatureGateTable';

export function UpcomingFeatures() {
    const { cluster } = useCluster();
    const featureGatesPath = useClusterPath({ pathname: '/feature-gates' });
    const { upcoming } = useMemo(() => partitionFeatures(cluster), [cluster]);
    // REVIEW(home-key-value-cards): the design-menu variant for the title link; a constant once one is chosen.
    const actionsLayout = useSectionActionsLayout();

    if (cluster === Cluster.Custom) {
        return undefined;
    }

    const features = filterUpcomingForCluster(upcoming, cluster);

    // With nothing upcoming the block is left out, as the Upcoming section of the feature gates page is.
    if (features.length === 0) {
        return undefined;
    }

    return (
        // className="" drops the section's own card: FeatureGateTable brings its own surface.
        <CollapsibleSection
            title={`Upcoming ${clusterName(cluster)} Features`}
            actions={
                <SectionLinkAction href={featureGatesPath} icon={<List />} label="View all feature gates" internal>
                    <Link href={featureGatesPath} className="text-sm">
                        View all feature gates
                    </Link>
                </SectionLinkAction>
            }
            actionsLayout={actionsLayout}
            collapsible={false}
            className=""
        >
            <div className="flex flex-col gap-3">
                <FeatureGateTable<UpcomingFeature>
                    features={features}
                    cluster={cluster}
                    secondColumn={{
                        header: 'Activation',
                        render: feature => <OtherActivationsCell activations={feature.otherActivations} />,
                    }}
                />
                {/* A link of its own under the table, not a table row: full width on phones (xxs, xs), as wide as
                    its label from `sm`. */}
                <Button variant="outline" size="sm" className="w-full sm:w-auto sm:self-start" asChild>
                    <Link href={featureGatesPath}>View all feature gates</Link>
                </Button>
            </div>
        </CollapsibleSection>
    );
}
