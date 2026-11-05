'use client';

import { useSlotTime } from '@entities/slot-time';
import { cva } from 'class-variance-authority';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { type ReactNode, useCallback, useMemo, useState } from 'react';

import { CollapsibleSection } from '@/app/components/shared/ui/collapsible-section';
import { useCluster, useClusterInfo } from '@/app/providers/cluster';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/shared/ui/Card';
import { PageHeader, PageLayout, PageSections } from '@/app/shared/ui/page-layout';
import { Cluster, clusterName, clusterSlug } from '@/app/utils/cluster';

import { estimateTimeUntilEpoch } from '../lib/epoch-countdown';
import { matchesFeatureQuery } from '../lib/match-feature-query';
import { mockPlannedEpoch } from '../lib/mock-planned-epoch';
import { type ActivatedFeature, partitionFeatures, type UpcomingFeature } from '../lib/partition-features';
import { previewUpcomingFeatures } from '../lib/preview-upcoming-features';
import {
    DEFAULT_SORT_DIRECTION,
    isSortDirection,
    sortActivatedFeatures,
    type SortDirection,
} from '../lib/sort-activated-features';
import { splitPlannedFeatures } from '../lib/split-planned-features';
import { useFeatureGateDesign, useFeatureGateMockPlanned, useFeatureGateSearchDesign } from '../model/design-variant';
import { ClusterEpoch, LINK_CLASS_NAME } from './ClusterEpoch';
import { FeatureGateList, SortToggle, StatusLine, UpcomingStatus } from './FeatureGateList';
import { EmptyStateCard, FeatureGateTable, OtherActivationsCell, ShowMoreButton } from './FeatureGateTable';
import { PageSearch } from './PageSearch';
import { Highlight, SearchHighlightProvider } from './SearchHighlight';

// The room under the last section, as the transaction page leaves under its instructions (`pb-10`).
const PAGE_BOTTOM = 'pb-10';

/** URL param holding the Activated sort direction, as `BlockHistoryCard` keeps its sort in `dir`. */
const SORT_PARAM = 'dir';

// Bottom-aligns the title with its count and the collapse toggle, as in `BlockHistoryCard`.
const SECTION_TITLE_CLASS_NAME = 'items-end gap-4';

/** Everything a countdown needs but the target epoch. Absent until the whole set is in hand. */
type CountdownInput = {
    currentEpoch: bigint;
    slotIndex: bigint;
    slotsInEpoch: bigint;
    slotsPerEpoch: bigint;
    msPerSlot: number;
};

export function FeatureGatesView() {
    const { cluster } = useCluster();
    const clusterInfo = useClusterInfo();
    // A custom cluster gets no table below, so its rate would be measured at the visitor's own node for
    // a countdown nothing renders.
    const msPerSlot = useSlotTime({ enabled: cluster !== Cluster.Custom });
    const { activated, upcoming } = useMemo(() => partitionFeatures(cluster), [cluster]);
    const [query, setQuery] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);
    const [showAllUpcoming, setShowAllUpcoming] = useState(false);
    const [sortDirection, toggleSortDirection] = useSortDirection();
    // REVIEW(HOO-926): the feed variant drops the table and the folding; the design menu picks it or the table.
    const design = useFeatureGateDesign();
    const feed = design === 'feed';
    // REVIEW(HOO-926): the design menu's search variant: a button that opens into the field, the field always open, or
    // the combo of the two (the button on mobile, the field on desktop).
    const searchDesign = useFeatureGateSearchDesign();
    const mockPlanned = useFeatureGateMockPlanned();
    const searchField = searchDesign === 'field';

    const matchingUpcoming = useMemo(
        () => upcoming.filter(feature => matchesFeatureQuery(feature, query)),
        [query, upcoming],
    );
    const matchingActivated = useMemo(
        () =>
            sortActivatedFeatures(
                activated.filter(feature => matchesFeatureQuery(feature, query)),
                sortDirection,
            ),
        [activated, query, sortDirection],
    );

    if (cluster === Cluster.Custom) {
        return (
            <PageLayout className={PAGE_BOTTOM}>
                <PageHeader title="Feature Gates" />
                <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900">
                    <CardHeader>
                        <CardTitle>Custom cluster</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-dark-foreground">
                        Enumeration of feature gates is not available on a custom cluster.
                    </CardContent>
                </Card>
            </PageLayout>
        );
    }

    // REVIEW(HOO-926): the design menu's planned mock moves the current epoch back, for the split and the countdowns
    // alike; off, it is the cluster's own.
    const currentEpoch = mockPlanned
        ? mockPlannedEpoch(activated, clusterInfo?.epochInfo.epoch)
        : clusterInfo?.epochInfo.epoch;

    const countdownInput: CountdownInput | undefined =
        clusterInfo && currentEpoch !== undefined && msPerSlot !== undefined
            ? {
                  currentEpoch,
                  msPerSlot,
                  slotIndex: clusterInfo.epochInfo.slotIndex,
                  slotsInEpoch: clusterInfo.epochInfo.slotsInEpoch,
                  slotsPerEpoch: clusterInfo.epochSchedule.slotsPerEpoch,
              }
            : undefined;

    // An activation epoch still ahead on this cluster is planned, not activated yet.
    const { activated: activatedFeatures, planned: plannedFeatures } = splitPlannedFeatures(
        matchingActivated,
        currentEpoch,
    );

    const searching = query.trim() !== '';
    // A search shows every match: folding the Upcoming list would hide results the visitor asked for.
    const { visible: visibleUpcoming, hiddenCount } = previewUpcomingFeatures(
        matchingUpcoming,
        showAllUpcoming || searching,
    );
    // A section with nothing to show is left out. When every one is, a single line says so, so a search with no
    // matches doesn't leave a blank page.
    const nothingToShow = matchingUpcoming.length + plannedFeatures.length + activatedFeatures.length === 0;
    const nothingToShowMessage = searching
        ? `No features match “${query.trim()}”.`
        : `No feature gates on ${clusterName(cluster)}.`;
    const upcomingFooter = hiddenCount > 0 && (
        <ShowMoreButton hiddenCount={hiddenCount} onClick={() => setShowAllUpcoming(true)} />
    );
    const upcomingTitle = (
        <SectionTitle count={matchingUpcoming.length} filtered={searching} large={feed}>
            Upcoming
        </SectionTitle>
    );
    const plannedTitle = (
        <SectionTitle count={plannedFeatures.length} filtered={searching} large={feed}>
            Planned
        </SectionTitle>
    );
    const activatedTitle = (
        <SectionTitle count={activatedFeatures.length} filtered={searching} large={feed}>
            Activated
        </SectionTitle>
    );
    const sortToggle = <SortToggle label="Activation" direction={sortDirection} onToggle={toggleSortDirection} />;
    const renderActivation = (feature: ActivatedFeature) => (
        <ActivationCell cluster={cluster} epoch={feature.clusterActivationEpoch} countdownInput={countdownInput} />
    );
    const renderActivationStatus = (feature: ActivatedFeature) => (
        <ActivationStatus cluster={cluster} epoch={feature.clusterActivationEpoch} countdownInput={countdownInput} />
    );

    return (
        <PageLayout className={PAGE_BOTTOM}>
            <PageHeader
                eyebrow={clusterName(cluster)}
                title="Feature Gates"
                // The search narrows every section at once, so it sits with the page title. As a button (and the combo
                // on a phone), open it takes the title's row and the title moves up beside the cluster; as a field, it
                // drops to its own line under the title when the two don't fit.
                condensed={!searchField && (searchOpen || query !== '')}
                wrapActions={searchField}
                actions={
                    <PageSearch
                        value={query}
                        onChange={setQuery}
                        open={searchOpen}
                        onOpenChange={setSearchOpen}
                        label="Search feature gates"
                        placeholder="Search page"
                        mode={searchDesign}
                    />
                }
            />

            <SearchHighlightProvider query={query}>
                <PageSections>
                    {nothingToShow && <EmptyStateCard>{nothingToShowMessage}</EmptyStateCard>}
                    {matchingUpcoming.length > 0 && (
                        <CollapsibleSection
                            title={upcomingTitle}
                            titleClassName={SECTION_TITLE_CLASS_NAME}
                            collapsible={!feed}
                            className=""
                        >
                            {feed ? (
                                <FeatureGateList<UpcomingFeature>
                                    features={visibleUpcoming}
                                    cluster={cluster}
                                    status={feature => <UpcomingStatus activations={feature.otherActivations} />}
                                    footer={upcomingFooter}
                                />
                            ) : (
                                <FeatureGateTable<UpcomingFeature>
                                    features={visibleUpcoming}
                                    cluster={cluster}
                                    secondColumn={{
                                        header: 'Activation',
                                        render: feature => (
                                            <OtherActivationsCell activations={feature.otherActivations} />
                                        ),
                                    }}
                                    footer={upcomingFooter}
                                />
                            )}
                        </CollapsibleSection>
                    )}

                    {plannedFeatures.length > 0 && (
                        <CollapsibleSection
                            title={plannedTitle}
                            titleClassName={SECTION_TITLE_CLASS_NAME}
                            collapsible={!feed}
                            className=""
                        >
                            {/* Soonest first, with no sort to flip: the countdown under each epoch reads in order. */}
                            {feed ? (
                                <FeatureGateList<ActivatedFeature>
                                    features={plannedFeatures}
                                    cluster={cluster}
                                    status={renderActivationStatus}
                                />
                            ) : (
                                <FeatureGateTable<ActivatedFeature>
                                    features={plannedFeatures}
                                    cluster={cluster}
                                    secondColumn={{ header: 'Activation', render: renderActivation }}
                                />
                            )}
                        </CollapsibleSection>
                    )}

                    {activatedFeatures.length > 0 && (
                        <CollapsibleSection
                            title={activatedTitle}
                            titleClassName={SECTION_TITLE_CLASS_NAME}
                            collapsible={!feed}
                            // The feed has no column header to sort on, so the toggle moves to the section's title row.
                            actions={feed ? sortToggle : undefined}
                            className=""
                        >
                            {feed ? (
                                <FeatureGateList<ActivatedFeature>
                                    features={activatedFeatures}
                                    cluster={cluster}
                                    status={renderActivationStatus}
                                />
                            ) : (
                                <FeatureGateTable<ActivatedFeature>
                                    features={activatedFeatures}
                                    cluster={cluster}
                                    secondColumn={{
                                        header: 'Activation',
                                        render: renderActivation,
                                        sort: { direction: sortDirection, onToggle: toggleSortDirection },
                                    }}
                                />
                            )}
                        </CollapsibleSection>
                    )}
                </PageSections>
            </SearchHighlightProvider>
        </PageLayout>
    );
}

// The record count rides in the title as a muted, smaller run, the way `BlockHistoryCard` counts its
// transactions; `inline-block` keeps it whole when it wraps under the title.
function SectionTitle({
    children,
    count,
    filtered,
    large,
}: {
    children: ReactNode;
    count: number;
    filtered: boolean;
    large: boolean;
}) {
    return (
        <>
            <span className={sectionTitleVariants({ large })}>{children}</span>
            <span className="inline-block text-sm font-normal text-outer-space-300">
                {count} {filtered ? 'filtered records' : 'records'}
            </span>
        </>
    );
}

// REVIEW(HOO-926): `large` is the feed variant's bigger section title.
const sectionTitleVariants = cva('mr-2', { variants: { large: { false: '', true: 'text-2xl font-medium' } } });

// The sort lives in the URL like `BlockHistoryCard`'s, so a sorted list survives a reload and can be shared.
// The default direction is written as a clean URL; other params (`cluster`) survive the change.
function useSortDirection(): [SortDirection, () => void] {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const param = searchParams?.get(SORT_PARAM);
    const direction = isSortDirection(param) ? param : DEFAULT_SORT_DIRECTION;

    const toggle = useCallback(() => {
        const params = new URLSearchParams(searchParams?.toString());
        const next: SortDirection = direction === 'asc' ? 'desc' : 'asc';
        if (next === DEFAULT_SORT_DIRECTION) params.delete(SORT_PARAM);
        else params.set(SORT_PARAM, next);
        const queryString = params.toString();
        router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
    }, [direction, pathname, router, searchParams]);

    return [direction, toggle];
}

function ActivationCell({
    cluster,
    epoch,
    countdownInput,
}: {
    cluster: Cluster;
    epoch: number;
    countdownInput: CountdownInput | undefined;
}) {
    const countdown = countdownInput ? estimateTimeUntilEpoch({ ...countdownInput, targetEpoch: epoch }) : undefined;
    return (
        // One line on the mobile card, the countdown under the epoch in the desktop column. Both runs take the
        // cell's type size.
        <div className="flex flex-wrap items-baseline gap-x-2 text-outer-space-300 lg:flex-col lg:items-start lg:gap-0.5">
            <ClusterEpoch cluster={cluster} epoch={epoch} />
            {countdown && <span className="whitespace-nowrap">in ~{countdown}</span>}
        </div>
    );
}

// REVIEW(HOO-926): the feed variant's status line for an activated feature. An epoch still ahead reads as scheduled,
// with the estimate of when it comes.
function ActivationStatus({
    cluster,
    epoch,
    countdownInput,
}: {
    cluster: Cluster;
    epoch: number;
    countdownInput: CountdownInput | undefined;
}) {
    const countdown = countdownInput ? estimateTimeUntilEpoch({ ...countdownInput, targetEpoch: epoch }) : undefined;
    const epochLink = (
        <Link href={`/epoch/${epoch}?cluster=${clusterSlug(cluster)}`} className={LINK_CLASS_NAME}>
            <Highlight text={String(epoch)} />
        </Link>
    );
    return countdown ? (
        <StatusLine tone="scheduled">
            Scheduled for epoch {epochLink} · in ~{countdown}
        </StatusLine>
    ) : (
        <StatusLine tone="active">Active since epoch {epochLink}</StatusLine>
    );
}
