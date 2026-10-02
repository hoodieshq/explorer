'use client';

import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { RawDataField } from '@components/shared/RawDataField';
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
import { KeyValue, TextValue } from '@/app/shared/ui/key-value';

// Raw account bytes view — mounted only while the Raw toggle is on so its SWR fetch doesn't run for the
// common case. Uses the same KeyValue rows as the default view so the card looks consistent when toggled.
function RawAccountRows({ account }: { account: Account }) {
    const { data, isLoading } = useRawAccountDataOnMount(account.pubkey);
    return (
        <>
            <KeyValue label="Address">
                <Address pubkey={account.pubkey} raw noTruncate />
            </KeyValue>

            <KeyValue label="Balance (SOL)" valueClassName="uppercase">
                <TextValue>
                    <SolBalance lamports={account.lamports} />
                </TextValue>
            </KeyValue>

            <KeyValue label="Assigned Program Id">
                <Address pubkey={account.owner} link noTruncate />
            </KeyValue>

            {account.space !== undefined && (
                <KeyValue label="Allocated Data Size">
                    <TextValue mono={false}>{account.space} byte(s)</TextValue>
                </KeyValue>
            )}

            <KeyValue label="Executable">
                <TextValue mono={false}>{account.executable ? 'Yes' : 'No'}</TextValue>
            </KeyValue>

            <KeyValue label="Raw Data">
                <RawDataField data={data} filename={account.pubkey.toBase58()} loading={isLoading} />
            </KeyValue>
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
                radius, no shadow. `overflow-hidden` clips the row dividers to the corners. No bottom margin:
                the address layout sets the gap to the tabs below. `text-white` is the values' colour (KeyValue
                labels set their own). */}
            <Card
                variant="tight"
                className="overflow-hidden !rounded-lg border-outer-space-800 bg-outer-space-900 text-white"
            >
                {showRaw ? (
                    <RawAccountRows account={account} />
                ) : (
                    <>
                        <KeyValue label="Address">
                            {/* Address renders its own Copyable — don't wrap it in another. */}
                            <Address pubkey={account.pubkey} raw noTruncate />
                        </KeyValue>

                        {label && (
                            <KeyValue label="Address Label">
                                <TextValue mono={false}>{label}</TextValue>
                            </KeyValue>
                        )}

                        <KeyValue label="Balance (SOL)" valueClassName="uppercase">
                            {account.lamports === 0 ? (
                                <AccountNofFound account={account} />
                            ) : (
                                <TextValue>
                                    <SolBalance lamports={account.lamports} />
                                </TextValue>
                            )}
                        </KeyValue>

                        {account.space !== undefined && (
                            <KeyValue label="Allocated Data Size">
                                <TextValue mono={false}>{account.space} byte(s)</TextValue>
                            </KeyValue>
                        )}

                        <KeyValue label="Assigned Program Id">
                            <Address pubkey={account.owner} link noTruncate />
                        </KeyValue>

                        <KeyValue label="Executable">
                            <TextValue mono={false}>{account.executable ? 'Yes' : 'No'}</TextValue>
                        </KeyValue>
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
