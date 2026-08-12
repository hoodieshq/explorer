import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { cn } from '@components/shared/utils';
import { PublicKey, VersionedBlockResponse } from '@solana/web3.js';
import React from 'react';

import { Button } from '@/app/components/shared/ui/button';
import { CollapsibleSection } from '@/app/features/transaction/ui/CollapsibleSection';
import { Card, CardFooter, CardHeader, CardTitle } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

const PAGE_SIZE = 10;

// Design variant, switchable via prop so the block page (and Storybook) can flip layouts without
// swapping components:
//   - 'default'     — the original Dashkit table.
//   - 'collapsible' — the domains-card treatment (PR #115): heading lifted out above a collapsible
//                     section, list on a `tight` card surface toned to match the transaction tables,
//                     a CSS-grid body on `lg+` and a stacked, labelled layout below `lg`.
export type BlockRewardsVariant = 'default' | 'collapsible';

type Reward = NonNullable<VersionedBlockResponse['rewards']>[number];

export function BlockRewardsCard({
    block,
    variant = 'default',
}: {
    block: VersionedBlockResponse;
    variant?: BlockRewardsVariant;
}) {
    if (!block.rewards || block.rewards.length < 1) {
        return null;
    }

    if (variant === 'collapsible') {
        return (
            <CollapsibleSection title="Block Rewards" className="">
                <Card variant="tight" className="overflow-hidden !rounded-lg border-outer-space-800 bg-outer-space-900">
                    <RewardsGrid rewards={block.rewards} />
                </Card>
            </CollapsibleSection>
        );
    }

    return <DashkitRewards rewards={block.rewards} />;
}

// Original design — Dashkit card + table.
function DashkitRewards({ rewards }: { rewards: Reward[] }) {
    const [rewardsDisplayed, setRewardsDisplayed] = React.useState(PAGE_SIZE);

    return (
        <Card ui="dashkit">
            <CardHeader ui="dashkit">
                <CardTitle as="h3" ui="dashkit">
                    Block Rewards
                </CardTitle>
            </CardHeader>
            <BaseTable ui="dashkit" variant="card" nowrap>
                <BaseTable.Head>
                    <BaseTable.Row>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Address</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Type</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Amount</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Post Balance</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Percent Change</BaseTable.HeaderCell>
                    </BaseTable.Row>
                </BaseTable.Head>
                <BaseTable.Body>
                    {rewards.map((reward, index) => {
                        if (index >= rewardsDisplayed - 1) {
                            return null;
                        }

                        const pct = percentChange(reward);
                        return (
                            <BaseTable.Row key={reward.pubkey + reward.rewardType}>
                                <BaseTable.Cell>
                                    <Address pubkey={new PublicKey(reward.pubkey)} link />
                                </BaseTable.Cell>
                                <BaseTable.Cell>{reward.rewardType}</BaseTable.Cell>
                                <BaseTable.Cell>
                                    <SolBalance lamports={reward.lamports} />
                                </BaseTable.Cell>
                                <BaseTable.Cell>
                                    {reward.postBalance ? <SolBalance lamports={reward.postBalance} /> : '-'}
                                </BaseTable.Cell>
                                <BaseTable.Cell>{pct ?? '-'}</BaseTable.Cell>
                            </BaseTable.Row>
                        );
                    })}
                </BaseTable.Body>
            </BaseTable>

            {rewards.length > rewardsDisplayed && (
                <CardFooter ui="dashkit">
                    <Button
                        ui="dashkit"
                        variant="primary"
                        className="w-full"
                        onClick={() => setRewardsDisplayed(displayed => displayed + PAGE_SIZE)}
                    >
                        Load More
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}

// Column labels, kept in one place so the desktop header and the mobile row labels can't drift.
const COLUMNS = ['Address', 'Type', 'Amount', 'Post Balance', '% Change'] as const;

// Address takes the slack (`1fr`); the numeric columns are capped so long balances don't push the
// address column to nothing. Header and every row share this template so columns stay aligned.
// Set as an inline style (not a `grid-cols-[…]` arbitrary class) because the Storybook Tailwind JIT
// doesn't always emit a brand-new arbitrary grid template picked up from a fresh file — the class
// silently no-ops and every column collapses into one. Inline `gridTemplateColumns` can't be purged.
const GRID_TEMPLATE: React.CSSProperties = {
    gridTemplateColumns: 'minmax(0,1fr) minmax(auto,4rem) minmax(auto,6.5rem) minmax(auto,8.5rem) minmax(auto,7.5rem)',
};

// Mirrors the original card's math: share of the pre-reward balance that this reward moved.
function percentChange(reward: Reward): string | undefined {
    if (!reward.postBalance) {
        return undefined;
    }
    const pct = (Math.abs(reward.lamports) / (reward.postBalance - reward.lamports)) * 100;
    return `${pct.toFixed(9)}%`;
}

// Shared body for the 'card' and 'collapsible' variants — a pure-Tailwind CSS grid on `lg+` plus a
// stacked, labelled layout below `lg` (the pattern from the transaction Token Balances card).
function RewardsGrid({ rewards }: { rewards: Reward[] }) {
    const [displayed, setDisplayed] = React.useState(PAGE_SIZE);
    const visible = rewards.slice(0, displayed);

    return (
        <div className="text-sm text-white">
            {/* Desktop grid header — muted uppercase labels, matching the transaction tables. */}
            <div
                style={GRID_TEMPLATE}
                className={cn(
                    'hidden gap-5 px-3 py-2.5 md:grid md:px-4',
                    'text-xs uppercase text-outer-space-300',
                    'border-b border-solid border-white/10',
                )}
            >
                {COLUMNS.map((label, i) => (
                    <div key={label} className={cn(i > 1 && 'text-right')}>
                        {label}
                    </div>
                ))}
            </div>

            {visible.map(reward => {
                const pct = percentChange(reward);
                const pubkey = new PublicKey(reward.pubkey);
                return (
                    <div
                        key={reward.pubkey + reward.rewardType}
                        className="border-b border-solid border-white/10 last:border-b-0"
                    >
                        {/* Mobile / tablet — stacked, labelled rows (block page has to fit five columns). */}
                        <div className="flex flex-col gap-1 px-3 py-3 md:hidden md:px-4">
                            <div className="flex items-center gap-2">
                                <span className="w-28 shrink-0 text-outer-space-300">Address</span>
                                <Address pubkey={pubkey} link />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-28 shrink-0 text-outer-space-300">Type</span>
                                <span>{reward.rewardType}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-28 shrink-0 text-outer-space-300">Amount</span>
                                <SolBalance lamports={reward.lamports} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-28 shrink-0 text-outer-space-300">Post Balance</span>
                                {reward.postBalance ? <SolBalance lamports={reward.postBalance} /> : <span>-</span>}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-28 shrink-0 text-outer-space-300">% Change</span>
                                <span>{pct ?? '-'}</span>
                            </div>
                        </div>

                        {/* Desktop grid row. */}
                        <div style={GRID_TEMPLATE} className="hidden items-start gap-5 px-3 py-2.5 md:grid md:px-4">
                            <div className="min-w-0">
                                <Address pubkey={pubkey} link />
                            </div>
                            <div>{reward.rewardType}</div>
                            <div className="text-right">
                                <SolBalance lamports={reward.lamports} />
                            </div>
                            <div className="text-right">
                                {reward.postBalance ? <SolBalance lamports={reward.postBalance} /> : '-'}
                            </div>
                            <div className="break-all text-right">{pct ?? '-'}</div>
                        </div>
                    </div>
                );
            })}

            {rewards.length > displayed && (
                <div className="border-t border-solid border-white/10 px-3 py-4 md:px-4">
                    <Button
                        ui="dashkit"
                        variant="primary"
                        className="w-full"
                        onClick={() => setDisplayed(d => d + PAGE_SIZE)}
                    >
                        Load More
                    </Button>
                </div>
            )}
        </div>
    );
}
