'use client';

import { BlockHistoryCard } from '@components/block/BlockHistoryCard';
import { type BlockFilterVariant, useBlockFilterVariant } from '@components/block/variants/block-filter-variant';
import { BlockHistoryCardCombined } from '@components/block/variants/BlockHistoryCardCombined';
import { BlockHistoryCardLinear } from '@components/block/variants/BlockHistoryCardLinear';
import { BlockHistoryCardMinimal } from '@components/block/variants/BlockHistoryCardMinimal';
import { BlockHistoryCardPopover } from '@components/block/variants/BlockHistoryCardPopover';
import { BlockHistoryCardSidebar } from '@components/block/variants/BlockHistoryCardSidebar';
import { useBlock, useFetchBlock } from '@providers/block';
import { useCluster, useEpochSchedule } from '@providers/cluster';
import { ClusterStatus } from '@utils/cluster';
import { getEpochForSlot } from '@utils/epoch-schedule';
import { notFound } from 'next/navigation';
import React from 'react';

type Props = Readonly<{ params: { slot: string } }>;

export default function BlockTransactionsTabClient({ params: { slot } }: Props) {
    const slotNumber = Number(slot);
    if (isNaN(slotNumber) || slotNumber >= Number.MAX_SAFE_INTEGER || slotNumber % 1 !== 0) {
        notFound();
    }
    const confirmedBlock = useBlock(slotNumber);
    const fetchBlock = useFetchBlock();
    const { status } = useCluster();
    const epochSchedule = useEpochSchedule();
    const filterVariant = useBlockFilterVariant();

    // Calculate epoch from slot
    const epoch = React.useMemo(() => {
        if (epochSchedule) {
            return getEpochForSlot(epochSchedule, BigInt(slotNumber));
        }
        return undefined;
    }, [epochSchedule, slotNumber]);

    // Fetch block on load
    React.useEffect(() => {
        if (!confirmedBlock && status === ClusterStatus.Connected) {
            fetchBlock(slotNumber);
        }
    }, [slotNumber, status]); // eslint-disable-line react-hooks/exhaustive-deps
    if (confirmedBlock?.data?.block) {
        const Card = VARIANT_CARDS[filterVariant];
        // REVIEW(HOO-1823): the card of the filtering variant picked in the design menu; remove before the external PR.
        return <Card block={confirmedBlock.data.block} epoch={epoch} />;
    }
    return null;
}

// REVIEW(HOO-1823): the card behind each filtering variant.
const VARIANT_CARDS: Record<BlockFilterVariant, typeof BlockHistoryCard> = {
    combined: BlockHistoryCardCombined,
    linear: BlockHistoryCardLinear,
    minimal: BlockHistoryCardMinimal,
    original: BlockHistoryCard,
    popover: BlockHistoryCardPopover,
    sidebar: BlockHistoryCardSidebar,
};
