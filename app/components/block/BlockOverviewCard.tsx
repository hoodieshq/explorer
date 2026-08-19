import { Address } from '@components/common/Address';
import { Copyable } from '@components/common/Copyable';
import { Epoch } from '@components/common/Epoch';
import { ExternalLinkWarning } from '@components/common/ExternalLinkWarning';
import { Slot } from '@components/common/Slot';
import { cn } from '@components/shared/utils';
import { estimateRequestedComputeUnits } from '@entities/compute-unit';
import { useCluster } from '@providers/cluster';
import { PublicKey, VersionedBlockResponse } from '@solana/web3.js';
import { displayTimestamp, displayTimestampUtc } from '@utils/date';
import { IBRL_EXPLORER_URL } from '@utils/env';
import React from 'react';
import { ExternalLink } from 'react-feather';

import { Card } from '@/app/shared/ui/Card';
import { getMaxComputeUnitsInBlock } from '@/app/utils/epoch-schedule';

// Grid-based key/value row, mirroring the transaction SummaryCard so overview cards stay consistent
// across pages. The `1fr` value column lets long mono values wrap (`break-all`) instead of forcing
// the whole card into horizontal scroll on narrow screens.
type RowProps = React.HTMLAttributes<HTMLDivElement> & { divider?: boolean };
function Row({ children, className, divider, ...props }: RowProps) {
    return (
        <div
            className={cn(
                'grid min-h-9 grid-cols-[clamp(100px,25%,200px)_1fr] items-baseline gap-2 px-3 py-2.5 md:px-4',
                divider && 'border-1 border-b border-white/10 [border-bottom-style:solid]',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}

function Label({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn('flex flex-wrap items-center gap-1 overflow-hidden text-sm text-outer-space-300', className)}
            {...props}
        >
            {children}
        </div>
    );
}

// `mono` toggles the monospace face — on for hashes/addresses/numbers, off for prose like dates.
// (cn is plain clsx here, so an added `font-sans` wouldn't reliably beat a hardcoded `font-mono`;
// omitting `font-mono` and inheriting the sans default is the robust way to opt out.)
// `breakAll` lets a long unbreakable token (a hash) wrap anywhere instead of forcing horizontal
// scroll; turn it off for space-separated prose/numbers so words wrap whole, only at the spaces.
function Value({
    children,
    className,
    mono = true,
    breakAll = true,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { mono?: boolean; breakAll?: boolean }) {
    return (
        <div className={cn('text-sm text-white', breakAll && 'break-all', mono && 'font-mono', className)} {...props}>
            {children}
        </div>
    );
}

type BlockOverviewCardProps = {
    block: VersionedBlockResponse;
    slot: number;
    epoch: bigint | undefined;
    blockLeader?: PublicKey;
    childSlot?: number;
    childLeader?: PublicKey;
    parentLeader?: PublicKey;
};

export function BlockOverviewCard({
    block,
    slot,
    epoch,
    blockLeader,
    childSlot,
    childLeader,
    parentLeader,
}: BlockOverviewCardProps) {
    const { cluster } = useCluster();

    let totalCUs = 0;
    let totalRequestedCUs = 0;
    let totalCostUnits = 0;
    for (const tx of block.transactions) {
        totalRequestedCUs += estimateRequestedComputeUnits(tx, epoch, cluster);
        totalCUs += tx.meta?.computeUnitsConsumed ?? 0;
        totalCostUnits += tx.meta?.costUnits ?? 0;
    }

    const showSuccessfulCount = block.transactions.every(tx => tx.meta !== null);
    const successfulTxs = block.transactions.filter(tx => tx.meta?.err === null);
    const maxComputeUnits = getMaxComputeUnitsInBlock({ cluster, epoch });

    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h2 className="m-0 text-lg font-normal text-white">Overview</h2>
                {IBRL_EXPLORER_URL && (
                    <ExternalLinkWarning href={`${IBRL_EXPLORER_URL}/block/${slot}`}>
                        <>
                            <ExternalLink className="me-2 align-text-top" size={13} />
                            IBRL Explorer
                        </>
                    </ExternalLinkWarning>
                )}
            </div>
            <Card ui="dashkit">
                <Row divider>
                    <Label>Blockhash</Label>
                    <Value className="flex w-full min-w-0 items-baseline">
                        <Copyable text={block.blockhash}>
                            <span className="min-w-0 break-all">{block.blockhash}</span>
                        </Copyable>
                    </Value>
                </Row>
                <Row divider>
                    <Label>Slot</Label>
                    <Value className="flex w-full min-w-0 items-baseline">
                        <Copyable text={String(slot)}>
                            <Slot slot={slot} />
                        </Copyable>
                    </Value>
                </Row>
                {blockLeader !== undefined && (
                    <Row divider>
                        <Label>Slot Leader</Label>
                        <Value>
                            <Address pubkey={blockLeader} link noTruncate />
                        </Value>
                    </Row>
                )}
                {block.blockTime ? (
                    <>
                        <Row divider>
                            <Label>Timestamp (Local)</Label>
                            <Value mono={false}>{displayTimestamp(block.blockTime * 1000, true)}</Value>
                        </Row>
                        <Row divider>
                            <Label>Timestamp (UTC)</Label>
                            <Value mono={false}>{displayTimestampUtc(block.blockTime * 1000, true)}</Value>
                        </Row>
                    </>
                ) : (
                    <Row divider>
                        <Label>Timestamp</Label>
                        <Value>Unavailable</Value>
                    </Row>
                )}
                {epoch !== undefined && (
                    <Row divider>
                        <Label>Epoch</Label>
                        <Value>
                            <Epoch epoch={epoch} link />
                        </Value>
                    </Row>
                )}
                <Row divider>
                    <Label>Parent Blockhash</Label>
                    <Value className="flex w-full min-w-0 items-baseline">
                        <Copyable text={block.previousBlockhash}>
                            <span className="min-w-0 break-all">{block.previousBlockhash}</span>
                        </Copyable>
                    </Value>
                </Row>
                <Row divider>
                    <Label>Parent Slot</Label>
                    <Value>
                        <Slot slot={block.parentSlot} link />
                    </Value>
                </Row>
                {parentLeader !== undefined && (
                    <Row divider>
                        <Label>Parent Slot Leader</Label>
                        <Value>
                            <Address pubkey={parentLeader} link noTruncate />
                        </Value>
                    </Row>
                )}
                {childSlot !== undefined && (
                    <Row divider>
                        <Label>Child Slot</Label>
                        <Value>
                            <Slot slot={childSlot} link />
                        </Value>
                    </Row>
                )}
                {childLeader !== undefined && (
                    <Row divider>
                        <Label>Child Slot Leader</Label>
                        <Value>
                            <Address pubkey={childLeader} link noTruncate />
                        </Value>
                    </Row>
                )}
                <Row divider>
                    <Label>Processed Transactions</Label>
                    <Value mono={false}>{block.transactions.length}</Value>
                </Row>
                {showSuccessfulCount && (
                    <Row divider>
                        <Label>Successful Transactions</Label>
                        <Value mono={false}>{successfulTxs.length}</Value>
                    </Row>
                )}
                <Row divider>
                    <Label>Total CUs Consumed</Label>
                    <Value mono={false}>{totalCUs.toLocaleString()}</Value>
                </Row>
                <Row divider>
                    <Label>Transaction Cost Utilization</Label>
                    <Value mono={false} breakAll={false}>
                        {totalCostUnits.toLocaleString()} / {maxComputeUnits.toLocaleString()}{' '}
                        <span className="text-outer-space-300">
                            ({Math.round((totalCostUnits / maxComputeUnits) * 100)}%)
                        </span>
                    </Value>
                </Row>
                <Row>
                    <Label>Reserved Compute Units</Label>
                    <Value mono={false} breakAll={false}>
                        {totalRequestedCUs.toLocaleString()} / {maxComputeUnits.toLocaleString()}{' '}
                        <span className="text-outer-space-300">
                            ({Math.round((totalRequestedCUs / maxComputeUnits) * 100)}%)
                        </span>
                    </Value>
                </Row>
            </Card>
        </section>
    );
}
