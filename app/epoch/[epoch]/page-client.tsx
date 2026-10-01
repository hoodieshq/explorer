'use client';

import { Copyable } from '@components/common/Copyable';
import { Epoch } from '@components/common/Epoch';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { Slot } from '@components/common/Slot';
import { FetchStatus } from '@providers/cache';
import { useCluster, useClusterInfo } from '@providers/cluster';
import { useEpoch, useFetchEpoch } from '@providers/epoch';
import { ClusterStatus } from '@utils/cluster';
import React from 'react';

import { Timestamp } from '@/app/components/shared/ui/timestamp';
import { Card } from '@/app/shared/ui/Card';
import { KeyValue } from '@/app/shared/ui/key-value';
import { getFirstSlotInEpoch, getLastSlotInEpoch } from '@/app/utils/epoch-schedule';

type Props = {
    params: {
        epoch: string;
    };
};

export default function EpochDetailsPageClient({ params: { epoch } }: Props) {
    let output;
    if (isNaN(Number(epoch))) {
        output = <ErrorCard text={`Epoch ${epoch} is not valid`} />;
    } else {
        output = <EpochOverviewCard epoch={Number(epoch)} />;
    }

    return (
        // Same page shell as the block and transaction pages (app/block/[slot]/layout.tsx): centered
        // max-w-5xl column, matching gutters, header and the translucent-green selection highlight.
        <div className="mx-auto flex max-w-5xl flex-col px-4 pt-3 selection:bg-[#13d89b40] selection:text-inherit lg:px-6 lg:pt-5">
            <header className="mb-3 flex flex-col gap-1.5 py-6">
                <span className="text-xs font-normal uppercase text-muted">Details</span>
                <h1 className="m-0 text-2xl font-normal leading-none text-white md:text-3xl">Epoch</h1>
            </header>
            <div className="flex flex-col space-y-9 lg:space-y-12">{output}</div>
        </div>
    );
}

type OverviewProps = { epoch: number };

function EpochOverviewCard({ epoch }: OverviewProps) {
    const { status } = useCluster();
    const clusterInfo = useClusterInfo();

    const epochState = useEpoch(epoch);
    const fetchEpoch = useFetchEpoch();

    // Fetch extra epoch info on load
    React.useEffect(() => {
        if (!clusterInfo) return;
        const { epochInfo, epochSchedule } = clusterInfo;
        const currentEpoch = epochInfo.epoch;
        if (epoch <= currentEpoch && !epochState && status === ClusterStatus.Connected)
            fetchEpoch(epoch, currentEpoch, epochSchedule);
    }, [epoch, epochState, clusterInfo, status, fetchEpoch]);

    // Ahead of the `clusterInfo` check, which is also unresolved on a failed connection: the epoch entry
    // only reports a failure once something has actually failed, so it is the more specific answer.
    if (epochState?.status === FetchStatus.FetchFailed) {
        return <ErrorCard text={`Failed to fetch details for epoch ${epoch}`} />;
    }

    if (!clusterInfo) {
        return <LoadingCard message="Connecting to cluster" />;
    }

    const { epochInfo, epochSchedule } = clusterInfo;
    const currentEpoch = epochInfo.epoch;
    if (epoch > currentEpoch) {
        return <ErrorCard text={`Epoch ${epoch} hasn't started yet`} />;
    } else if (!epochState?.data) {
        return <LoadingCard message="Loading epoch" />;
    }

    const firstSlot = getFirstSlotInEpoch(epochSchedule, BigInt(epoch));
    const lastSlot = getLastSlotInEpoch(epochSchedule, BigInt(epoch));

    return (
        <section className="flex flex-col gap-3">
            <h2 className="m-0 text-lg font-normal text-white">Overview</h2>
            {/* Pure-Tailwind take on the transaction Overview card (`Card ui="dashkit"`), kept on the
                `outer-space` scale: `900` approximates dashkit's `#1e2423` background, `800` is the border.
                `text-white` restores the body colour the dashkit card inherits instead of the tw variant's
                `text-neutral-200`. `variant="tight"` drops the tw padding so rows sit on the edge. */}
            <Card variant="tight" className="rounded-lg border-outer-space-800 bg-outer-space-900 text-white">
                <KeyValue label="Epoch">
                    <Copyable text={String(epoch)}>
                        <Epoch epoch={epoch} />
                    </Copyable>
                </KeyValue>
                {epoch > 0 && (
                    <KeyValue label="Previous Epoch">
                        <Epoch epoch={epoch - 1} link />
                    </KeyValue>
                )}
                <KeyValue label="Next Epoch">
                    {currentEpoch > epoch ? (
                        <Epoch epoch={epoch + 1} link />
                    ) : (
                        <span className="text-outer-space-300">Epoch in progress</span>
                    )}
                </KeyValue>
                <KeyValue label="First Slot">
                    <Slot slot={firstSlot} />
                </KeyValue>
                <KeyValue label="Last Slot">
                    <Slot slot={lastSlot} />
                </KeyValue>
                {epochState.data.firstTimestamp && (
                    <KeyValue label="First Block Timestamp">
                        <Timestamp unixTimestamp={epochState.data.firstTimestamp} />
                    </KeyValue>
                )}
                <KeyValue label="First Block">
                    <Slot slot={epochState.data.firstBlock} link />
                </KeyValue>
                <KeyValue label="Last Block">
                    {epochState.data.lastBlock !== undefined ? (
                        <Slot slot={epochState.data.lastBlock} link />
                    ) : (
                        <span className="text-outer-space-300">Epoch in progress</span>
                    )}
                </KeyValue>
                {epochState.data.lastTimestamp && (
                    <KeyValue label="Last Block Timestamp">
                        <Timestamp unixTimestamp={epochState.data.lastTimestamp} />
                    </KeyValue>
                )}
            </Card>
        </section>
    );
}
