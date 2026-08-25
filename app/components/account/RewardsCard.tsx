'use client';

import { Epoch } from '@components/common/Epoch';
import { ErrorCard } from '@components/common/ErrorCard';
import { LoadingCard } from '@components/common/LoadingCard';
import { Slot } from '@components/common/Slot';
import { CollapsibleSection } from '@components/shared/ui/collapsible-section';
import { cn } from '@components/shared/utils';
import { isParsedAccountProgram, STAKE_PROGRAM_LABEL } from '@explorer/parsers';
import { useAccountInfo } from '@providers/accounts';
import { useFetchRewards, useRewards } from '@providers/accounts/rewards';
import { FetchStatus } from '@providers/cache';
import { PublicKey } from '@solana/web3.js';
import { lamportsToSolString } from '@utils/index';
import React from 'react';

import { Button } from '@/app/components/shared/ui/button';
import { Card, CardBody } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

const U64_MAX = BigInt('0xffffffffffffffff');

export type RewardsLayout = 'table' | 'grid';

// Column labels shared by both layouts so the header copy can't drift between table and grid. The SOL
// unit lives in the header; the rows repeat it with the `◎` glyph.
const COLUMNS = ['Epoch', 'Effective Slot', 'Reward (SOL)', 'Post Balance (SOL)'] as const;

// The reward fields the row rendering needs (the provider's entry carries more, e.g. commission).
type RewardEntry = { epoch: number; effectiveSlot: number; amount: number; postBalance: number };

// SOL amount with the currency glyph, e.g. `◎0.0125`.
const solAmount = (lamports: number | bigint) => `◎${lamportsToSolString(lamports)}`;

export function RewardsCard({ address, layout = 'table' }: { address: string; layout?: RewardsLayout }) {
    const pubkey = React.useMemo(() => new PublicKey(address), [address]);
    const info = useAccountInfo(address);
    const account = info?.data;
    const parsedData = account?.data.parsed;

    const highestEpoch = React.useMemo(() => {
        if (!isParsedAccountProgram(parsedData, STAKE_PROGRAM_LABEL)) return;
        const stakeInfo = parsedData.parsed.info.stake;
        if (stakeInfo !== null && stakeInfo.delegation.deactivationEpoch !== U64_MAX) {
            return Number(stakeInfo.delegation.deactivationEpoch);
        }
    }, [parsedData]);

    const rewards = useRewards(address);
    const fetchRewards = useFetchRewards();
    const loadMore = () => fetchRewards(pubkey, highestEpoch);

    React.useEffect(() => {
        if (!rewards) {
            fetchRewards(pubkey, highestEpoch);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    if (!rewards) {
        return null;
    }

    if (rewards?.data === undefined) {
        if (rewards.status === FetchStatus.Fetching) {
            return <LoadingCard message="Loading rewards" />;
        }

        return <ErrorCard retry={loadMore} text="Failed to fetch rewards" />;
    }

    const rewardList = rewards.data.rewards.filter((r): r is NonNullable<typeof r> => r !== null);
    const rewardsFound = rewardList.length > 0;
    const { foundOldest, lowestFetchedEpoch, highestFetchedEpoch } = rewards.data;
    const fetching = rewards.status === FetchStatus.Fetching;

    const emptyBody = (
        <CardBody ui="dashkit">
            No rewards issued between epochs {lowestFetchedEpoch} and {highestFetchedEpoch}
        </CardBody>
    );

    // Both footer states get a uniform 12px inset on all sides (p-3), with the grid's row-separator border.
    const footer = foundOldest ? (
        <div className="border-1 border-t border-white/10 p-3 text-dk-gray-700 [border-top-style:solid]">
            Fetched full reward history
        </div>
    ) : (
        <div className="border-1 border-t border-white/10 p-3 [border-top-style:solid]">
            <Button ui="dashkit" variant="primary" className="w-full" onClick={() => loadMore()} disabled={fetching}>
                {fetching ? (
                    <>
                        <span className="spinner-grow spinner-grow-sm mr-1.5 align-text-top"></span>
                        Loading
                    </>
                ) : (
                    'Load More'
                )}
            </Button>
        </div>
    );

    // Heading lifted out above the card via CollapsibleSection — same pattern as the Vote History card
    // (`className=""` so the surface comes from the `<Card>` below).
    return (
        <CollapsibleSection title="Rewards" className="">
            {layout === 'grid' ? (
                <Card variant="tight" className="!rounded-lg border-outer-space-800 bg-outer-space-900">
                    {rewardsFound ? <RewardsGrid rewards={rewardList} /> : emptyBody}
                    {footer}
                </Card>
            ) : (
                <Card ui="dashkit" marginBottom="none">
                    {rewardsFound ? <RewardsTable rewards={rewardList} /> : emptyBody}
                    {footer}
                </Card>
            )}
        </CollapsibleSection>
    );
}

// `<table>` layout — the shared BaseTable (dashkit surface) with the original columns.
function RewardsTable({ rewards }: { rewards: RewardEntry[] }) {
    return (
        <BaseTable ui="dashkit" variant="card" nowrap>
            <BaseTable.Head>
                <BaseTable.Row>
                    <BaseTable.HeaderCell className="w-px text-dk-gray-700">{COLUMNS[0]}</BaseTable.HeaderCell>
                    <BaseTable.HeaderCell className="text-dk-gray-700">{COLUMNS[1]}</BaseTable.HeaderCell>
                    <BaseTable.HeaderCell className="text-dk-gray-700">{COLUMNS[2]}</BaseTable.HeaderCell>
                    <BaseTable.HeaderCell className="text-dk-gray-700">{COLUMNS[3]}</BaseTable.HeaderCell>
                </BaseTable.Row>
            </BaseTable.Head>
            <BaseTable.Body>
                {rewards.map(reward => (
                    <BaseTable.Row key={reward.epoch}>
                        <BaseTable.Cell>
                            <Epoch epoch={reward.epoch} link />
                        </BaseTable.Cell>
                        <BaseTable.Cell>
                            <Slot slot={reward.effectiveSlot} link />
                        </BaseTable.Cell>
                        <BaseTable.Cell className="font-mono">{solAmount(reward.amount)}</BaseTable.Cell>
                        <BaseTable.Cell className="font-mono">{solAmount(reward.postBalance)}</BaseTable.Cell>
                    </BaseTable.Row>
                ))}
            </BaseTable.Body>
        </BaseTable>
    );
}

// Four equal-width columns, shared by the desktop header row and each desktop data row.
const GRID_TEMPLATE = 'grid-cols-4 gap-5';

// Grid layout, responsive like the transaction Tokens/Accounts tables: an `sm`+ grid (header row + data
// rows) and, below `sm`, each row stacks into labelled fields. Cell padding matches the Vote History
// table (px-3 py-2.5). Reward and Post Balance are right-aligned.
function RewardsGrid({ rewards }: { rewards: RewardEntry[] }) {
    return (
        <div className="text-sm text-white">
            <div
                className={cn(
                    'border-1 hidden border-b border-white/10 px-3 py-2.5 text-xs uppercase text-outer-space-300 [border-bottom-style:solid] sm:grid',
                    GRID_TEMPLATE,
                )}
            >
                {COLUMNS.map((label, i) => (
                    <div key={label} className={i >= 2 ? 'text-right' : undefined}>
                        {label}
                    </div>
                ))}
            </div>
            {rewards.map(reward => (
                <RewardRow key={reward.epoch} reward={reward} />
            ))}
        </div>
    );
}

function MobileField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-2">
            <span className="w-28 shrink-0 text-outer-space-300">{label}</span>
            {children}
        </div>
    );
}

function RewardRow({ reward }: { reward: RewardEntry }) {
    return (
        <div className="border-1 border-b border-white/10 [border-bottom-style:solid] last:border-b-0">
            {/* Below sm: stacked, labelled fields. */}
            <div className="flex flex-col gap-1 px-3 py-3 sm:hidden">
                <MobileField label="Epoch">
                    <Epoch epoch={reward.epoch} link />
                </MobileField>
                <MobileField label="Effective Slot">
                    <Slot slot={reward.effectiveSlot} link />
                </MobileField>
                <MobileField label="Reward">
                    <span className="font-mono">{solAmount(reward.amount)}</span>
                </MobileField>
                <MobileField label="Post Balance">
                    <span className="font-mono">{solAmount(reward.postBalance)}</span>
                </MobileField>
            </div>
            {/* sm+: grid row aligned to the header. */}
            <div className={cn('hidden min-h-9 items-center px-3 py-2.5 sm:grid', GRID_TEMPLATE)}>
                <div>
                    <Epoch epoch={reward.epoch} link />
                </div>
                <div>
                    <Slot slot={reward.effectiveSlot} link />
                </div>
                <div className="text-right font-mono">{solAmount(reward.amount)}</div>
                <div className="text-right font-mono">{solAmount(reward.postBalance)}</div>
            </div>
        </div>
    );
}
