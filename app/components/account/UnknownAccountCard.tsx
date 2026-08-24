'use client';

import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { RawDataField } from '@components/shared/RawDataField';
import { cn } from '@components/shared/utils';
import { useRawAccountDataOnMount } from '@entities/account';
import { AdjacentClusterLink, SearchingClusterIndicator, useClusterResourceSearch } from '@entities/cluster';
import { AccountDownloadDropdown } from '@features/account';
import { Account } from '@providers/accounts';
import { useCluster } from '@providers/cluster';
import { address as createAddress, createSolanaRpc } from '@solana/kit';
import { addressLabel } from '@utils/tx';
import React from 'react';
import { Code } from 'react-feather';

import { Button } from '@/app/components/shared/ui/button';
import { Card } from '@/app/shared/ui/Card';

// Grid-based key/value row, mirroring the block Overview / Vote Account cards so account overview cards
// stay consistent. The `1fr` value column lets long mono values wrap (`break-all`) instead of forcing
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

// `mono` toggles the monospace face — on for hashes/addresses/numbers, off for prose. `breakAll` lets a
// long unbreakable token (a pubkey) wrap anywhere instead of forcing horizontal scroll.
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

// Raw account bytes view — mounted only while the Raw toggle is on so its SWR fetch doesn't run for the
// common case. Uses the same grid Row/Label/Value layout as the default view so the card looks consistent
// when toggled (rather than the old dashkit BaseTable rows).
function RawAccountRows({ account }: { account: Account }) {
    const { data, isLoading } = useRawAccountDataOnMount(account.pubkey);
    return (
        <>
            <Row divider>
                <Label>Address</Label>
                <Value className="flex w-full min-w-0 items-baseline">
                    <Address pubkey={account.pubkey} raw noTruncate />
                </Value>
            </Row>

            <Row divider>
                <Label>Balance (SOL)</Label>
                <Value className="uppercase">
                    <SolBalance lamports={account.lamports} />
                </Value>
            </Row>

            <Row divider>
                <Label>Assigned Program Id</Label>
                <Value>
                    <Address pubkey={account.owner} link noTruncate />
                </Value>
            </Row>

            {account.space !== undefined && (
                <Row divider>
                    <Label>Allocated Data Size</Label>
                    <Value mono={false}>{account.space} byte(s)</Value>
                </Row>
            )}

            <Row divider>
                <Label>Executable</Label>
                <Value mono={false}>{account.executable ? 'Yes' : 'No'}</Value>
            </Row>

            <Row>
                <Label>Raw Data</Label>
                <Value className="min-w-0">
                    <RawDataField data={data} filename={account.pubkey.toBase58()} loading={isLoading} />
                </Value>
            </Row>
        </>
    );
}

export function UnknownAccountCard({ account }: { account: Account }) {
    const { cluster } = useCluster();
    const [showRaw, setShowRaw] = React.useState(false);

    const label = addressLabel(account.pubkey.toBase58(), cluster);

    return (
        <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
                <h2 className="m-0 text-lg font-normal text-white">Overview</h2>
                <div className="flex items-center gap-2">
                    <Button
                        variant={showRaw ? 'default' : 'outline'}
                        size="sm"
                        aria-label="Raw"
                        className={showRaw ? 'shadow-active-sm' : undefined}
                        onClick={() => setShowRaw(r => !r)}
                    >
                        <Code size={12} />
                        <span className="hidden md:inline">Raw</span>
                    </Button>
                    <AccountDownloadDropdown pubkey={account.pubkey} space={account.space} />
                </div>
            </div>

            {/* Card outline matched to the block/vote tight cards: visible outer-space-800 border, 8px
                radius, no shadow. `overflow-hidden` clips the row dividers to the corners; `mb-6` keeps
                the gap to the tabs below. */}
            <Card
                variant="tight"
                className="mb-6 overflow-hidden !rounded-lg border-outer-space-800 bg-outer-space-900"
            >
                {showRaw ? (
                    <RawAccountRows account={account} />
                ) : (
                    <>
                        <Row divider>
                            <Label>Address</Label>
                            <Value className="flex w-full min-w-0 items-baseline">
                                {/* Address renders its own Copyable — don't wrap it in another. */}
                                <Address pubkey={account.pubkey} raw noTruncate />
                            </Value>
                        </Row>

                        {label && (
                            <Row divider>
                                <Label>Address Label</Label>
                                <Value mono={false}>{label}</Value>
                            </Row>
                        )}

                        <Row divider>
                            <Label>Balance (SOL)</Label>
                            <Value className="uppercase">
                                {account.lamports === 0 ? (
                                    <AccountNofFound account={account} />
                                ) : (
                                    <SolBalance lamports={account.lamports} />
                                )}
                            </Value>
                        </Row>

                        {account.space !== undefined && (
                            <Row divider>
                                <Label>Allocated Data Size</Label>
                                <Value mono={false}>{account.space} byte(s)</Value>
                            </Row>
                        )}

                        <Row divider>
                            <Label>Assigned Program Id</Label>
                            <Value>
                                <Address pubkey={account.owner} link noTruncate />
                            </Value>
                        </Row>

                        <Row>
                            <Label>Executable</Label>
                            <Value mono={false}>{account.executable ? 'Yes' : 'No'}</Value>
                        </Row>
                    </>
                )}
            </Card>
        </section>
    );
}

const LABELS = {
    'not-found': 'Account does not exist',
};

function AccountNofFound({ account, labels = LABELS }: { account: Account; labels?: typeof LABELS }) {
    const { cluster } = useCluster();
    const address = account.pubkey.toBase58();
    const { status, searchingCluster, foundCluster } = useClusterResourceSearch({
        currentCluster: cluster,
        probe: probeAccount,
        resourceId: address,
    });

    if (status === 'searching' && searchingCluster !== undefined) {
        return (
            <span>
                <SearchingClusterIndicator searchingCluster={searchingCluster} />
                <span className="align-middle">{labels['not-found']}</span>
            </span>
        );
    }

    if (status === 'found' && foundCluster !== undefined) {
        return (
            <span>
                <AdjacentClusterLink foundCluster={foundCluster} pathname={`/address/${address}`} />
                <span className="align-middle">{labels['not-found']}</span>
            </span>
        );
    }

    return <span>{labels['not-found']}</span>;
}

async function probeAccount(url: string, address: string): Promise<boolean> {
    const rpc = createSolanaRpc(url);
    const { value } = await rpc.getAccountInfo(createAddress(address), { encoding: 'base64' }).send();

    // RPC returns literal null when the account does not exist on that cluster
    return value !== null;
}
