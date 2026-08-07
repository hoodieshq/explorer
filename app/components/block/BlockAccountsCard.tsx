import { Address } from '@components/common/Address';
import { cn } from '@components/shared/utils';
import type { BlockWithV1 } from '@entities/block-data';
import { PublicKey } from '@solana/web3.js';
import { useClusterPath } from '@utils/url';
import Link from 'next/link';
import React from 'react';

import { Button } from '@/app/components/shared/ui/button';
import { CollapsibleSection } from '@/app/features/transaction/ui/CollapsibleSection';
import { invariant } from '@/app/shared/lib/invariant';
import { Card, CardFooter, CardHeader, CardTitle } from '@/app/shared/ui/Card';
import { BaseTable } from '@/app/shared/ui/Table';

type AccountStats = {
    reads: number;
    writes: number;
};

// Design variant, switchable via prop (see BlockRewardsCard for the same pattern):
//   - 'default'     — the original Dashkit card + table.
//   - 'collapsible' — the domains-card treatment (PR #115): heading lifted out above a collapsible
//                     section, list on a `tight` card surface, CSS-grid body on `lg+` and a stacked,
//                     labelled layout below `lg`.
export type BlockAccountsVariant = 'default' | 'collapsible';

// Surface matched to the transaction tables (see BaseDomainsCard) — set on a `variant="tight"` Card.
const TIGHT_CARD = 'overflow-hidden rounded-lg border-outer-space-800 bg-outer-space-900';

const PAGE_SIZE = 25;

export function BlockAccountsCard({
    block,
    blockSlot,
    variant = 'default',
}: {
    block: BlockWithV1;
    blockSlot: number;
    variant?: BlockAccountsVariant;
}) {
    const [numDisplayed, setNumDisplayed] = React.useState(10);
    const totalTransactions = block.transactions.length;

    const accountStats = React.useMemo(() => {
        const statsMap = new Map<string, AccountStats>();
        block.transactions.forEach(tx => {
            const message = tx.transaction.message;
            const txSet = new Map<string, boolean>();
            const accountKeys = message.getAccountKeys({
                accountKeysFromLookups: tx.meta?.loadedAddresses,
            });
            message.compiledInstructions.forEach(ix => {
                ix.accountKeyIndexes.forEach(index => {
                    const accountKey = accountKeys.get(index);
                    invariant(accountKey, `account key index ${index} out of range`);
                    const address = accountKey.toBase58();
                    txSet.set(address, message.isAccountWritable(index));
                });
            });

            txSet.forEach((isWritable, address) => {
                const stats = statsMap.get(address) || { reads: 0, writes: 0 };
                if (isWritable) {
                    stats.writes++;
                } else {
                    stats.reads++;
                }
                statsMap.set(address, stats);
            });
        });

        const accountEntries: [string, AccountStats][] = [];
        statsMap.forEach((value, key) => {
            accountEntries.push([key, value]);
        });

        accountEntries.sort((a, b) => {
            const aCount = a[1].reads + a[1].writes;
            const bCount = b[1].reads + b[1].writes;
            if (aCount < bCount) return 1;
            if (aCount > bCount) return -1;
            return 0;
        });

        return accountEntries;
    }, [block]);

    const visible = accountStats.slice(0, numDisplayed);
    const hasMore = accountStats.length > numDisplayed;
    const loadMore = () => setNumDisplayed(displayed => displayed + PAGE_SIZE);

    if (variant === 'collapsible') {
        return (
            <CollapsibleSection title="Block Account Usage" className="">
                <Card variant="tight" className={TIGHT_CARD}>
                    <AccountsGrid
                        blockSlot={blockSlot}
                        hasMore={hasMore}
                        onLoadMore={loadMore}
                        rows={visible}
                        totalTransactions={totalTransactions}
                    />
                </Card>
            </CollapsibleSection>
        );
    }

    return (
        <Card ui="dashkit">
            <CardHeader ui="dashkit">
                <CardTitle as="h3" ui="dashkit">
                    Block Account Usage
                </CardTitle>
            </CardHeader>
            <BaseTable ui="dashkit" variant="card" nowrap>
                <BaseTable.Head>
                    <BaseTable.Row>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Account</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Read-Write Count</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Read-Only Count</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">Total Count</BaseTable.HeaderCell>
                        <BaseTable.HeaderCell className="text-dk-gray-700">% of Transactions</BaseTable.HeaderCell>
                    </BaseTable.Row>
                </BaseTable.Head>
                <BaseTable.Body>
                    {visible.map(([address, { writes, reads }]) => (
                        <StatsRow
                            address={address}
                            blockSlot={blockSlot}
                            key={address}
                            reads={reads}
                            totalTransactions={totalTransactions}
                            writes={writes}
                        />
                    ))}
                </BaseTable.Body>
            </BaseTable>

            {hasMore && (
                <CardFooter ui="dashkit">
                    <Button ui="dashkit" variant="primary" className="w-full" onClick={loadMore}>
                        Load More
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}

function StatsRow({
    address,
    blockSlot,
    writes,
    reads,
    totalTransactions,
}: {
    address: string;
    blockSlot: number;
    writes: number;
    reads: number;
    totalTransactions: number;
}) {
    const accountPath = useClusterPath({
        additionalParams: new URLSearchParams(`accountFilter=${address}&filter=all`),
        pathname: `/block/${blockSlot}`,
    });
    return (
        <BaseTable.Row>
            <BaseTable.Cell>
                <Link href={accountPath}>
                    <Address pubkey={new PublicKey(address)} />
                </Link>
            </BaseTable.Cell>
            <BaseTable.Cell>{writes}</BaseTable.Cell>
            <BaseTable.Cell>{reads}</BaseTable.Cell>
            <BaseTable.Cell>{writes + reads}</BaseTable.Cell>
            <BaseTable.Cell>{((100 * (writes + reads)) / totalTransactions).toFixed(2)}%</BaseTable.Cell>
        </BaseTable.Row>
    );
}

// Program takes the slack; the numeric columns are capped. Header + rows share this template so
// columns stay aligned. Inline (not a `grid-cols-[…]` class) so the Storybook JIT can't purge it.
const ACCOUNTS_GRID: React.CSSProperties = {
    gridTemplateColumns: 'minmax(0,1fr) repeat(3, minmax(auto,5rem)) minmax(auto,7.5rem)',
};

// Domains-card style — a CSS grid on lg+, stacked labelled rows below lg.
function AccountsGrid({
    rows,
    blockSlot,
    totalTransactions,
    hasMore,
    onLoadMore,
}: {
    rows: [string, AccountStats][];
    blockSlot: number;
    totalTransactions: number;
    hasMore: boolean;
    onLoadMore: () => void;
}) {
    const headers = ['Account', 'Read-Write', 'Read-Only', 'Total', '% of Transactions'];
    return (
        <div className="text-sm text-white">
            <div
                style={ACCOUNTS_GRID}
                className={cn(
                    'hidden gap-5 px-3 py-2.5 md:px-4 md:grid',
                    'border-b border-solid border-white/10',
                    'text-xs uppercase text-outer-space-300',
                )}
            >
                {headers.map((label, i) => (
                    <div key={i} className={cn(i > 0 && 'text-right')}>
                        {label}
                    </div>
                ))}
            </div>

            {rows.map(([address, stats]) => (
                <AccountsGridRow
                    address={address}
                    blockSlot={blockSlot}
                    key={address}
                    reads={stats.reads}
                    totalTransactions={totalTransactions}
                    writes={stats.writes}
                />
            ))}

            {hasMore && (
                <div className="border-t border-solid border-white/10 px-3 py-4 md:px-4">
                    <Button ui="dashkit" variant="primary" className="w-full" onClick={onLoadMore}>
                        Load More
                    </Button>
                </div>
            )}
        </div>
    );
}

function AccountsGridRow({
    address,
    blockSlot,
    writes,
    reads,
    totalTransactions,
}: {
    address: string;
    blockSlot: number;
    writes: number;
    reads: number;
    totalTransactions: number;
}) {
    const accountPath = useClusterPath({
        additionalParams: new URLSearchParams(`accountFilter=${address}&filter=all`),
        pathname: `/block/${blockSlot}`,
    });
    const fields = [
        { label: 'Read-Write', value: `${writes}` },
        { label: 'Read-Only', value: `${reads}` },
        { label: 'Total', value: `${writes + reads}` },
        { label: '% of Transactions', value: `${((100 * (writes + reads)) / totalTransactions).toFixed(2)}%` },
    ];
    return (
        <div className="border-b border-solid border-white/10 last:border-b-0">
            {/* Mobile / tablet — stacked, labelled rows. Label column matches BlockOverviewCard. */}
            <div className="flex flex-col gap-1 px-3 py-3 md:px-4 md:hidden">
                <div className="grid grid-cols-[clamp(100px,25%,200px)_1fr] items-baseline gap-2">
                    <span className="text-outer-space-300">Account</span>
                    <Link href={accountPath}>
                        <Address pubkey={new PublicKey(address)} />
                    </Link>
                </div>
                {fields.map((f, i) => (
                    <div key={i} className="grid grid-cols-[clamp(100px,25%,200px)_1fr] items-baseline gap-2">
                        <span className="text-outer-space-300">{f.label}</span>
                        <span>{f.value}</span>
                    </div>
                ))}
            </div>

            {/* Desktop grid row. */}
            <div style={ACCOUNTS_GRID} className="hidden items-start gap-5 px-3 py-2.5 md:px-4 md:grid">
                <div className="min-w-0">
                    <Link href={accountPath}>
                        <Address pubkey={new PublicKey(address)} />
                    </Link>
                </div>
                {fields.map((f, i) => (
                    <div key={i} className="text-right">
                        {f.value}
                    </div>
                ))}
            </div>
        </div>
    );
}
