'use client';

import { Address } from '@components/common/Address';
import { SolBalance } from '@components/common/SolBalance';
import { RawDataField } from '@components/shared/RawDataField';
import { useRawAccountDataOnMount } from '@entities/account';
import type { Account } from '@providers/accounts';
import { useCluster } from '@providers/cluster';
import { addressLabel } from '@utils/tx';
import { useState, type ReactNode } from 'react';
import { Code } from 'react-feather';

import { AccountDownloadDropdown } from '@/app/features/account/ui/AccountDownloadDropdown';
import { Button } from '@/app/components/shared/ui/button';

import { SectionCard } from './SectionCard';

// Slice-local copy of components/account/UnknownAccountCard, flattened (AccountCard + BaseAccountCard
// inlined) so the "Overview" title can be lifted OUT of the card the transaction-page way. The rows
// are modelled on the transaction page's Summary card (app/features/transaction/ui/SummaryCard.tsx):
// each field is a CSS-grid Row whose label column is `clamp(100px,25%,200px)` and value column `1fr`.
// So the label column is a fixed proportion of the card (not sized to the longest label), the values
// all start at one x, and a long value (address / raw data) wraps inside its column via `break-all`
// instead of overflowing. The zero-balance "search other clusters" branch is dropped — the mock
// wallet always has a balance — everything else mirrors production, including the Raw toggle and
// download dropdown, sitting as section actions beside the title.

// One key/value row. Grid columns mirror SummaryCard's `Row`: label = clamp(100px,25%,200px), value = 1fr,
// baselines aligned. Row padding (px-3) matches the page's table sections; dividers come from the
// wrapping `divide-y` so there's no rule above the first row or below the last.
function Row({ children }: { children: ReactNode }) {
    return (
        <div className="grid min-h-9 grid-cols-[clamp(100px,25%,200px)_1fr] items-baseline gap-2 px-3 py-2">
            {children}
        </div>
    );
}

function Label({ children }: { children: ReactNode }) {
    return (
        <div className="flex flex-wrap items-center gap-1 overflow-hidden text-sm text-outer-space-300">{children}</div>
    );
}

function Value({ children }: { children: ReactNode }) {
    return <div className="break-all text-sm text-white">{children}</div>;
}

export function OverviewCard({ account }: { account: Account }) {
    const { cluster } = useCluster();
    const [showRaw, setShowRaw] = useState(false);
    const label = addressLabel(account.pubkey.toBase58(), cluster);

    return (
        <SectionCard
            title="Overview"
            actions={
                <>
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
                </>
            }
        >
            <div className="divide-y divide-white/10">
                {showRaw ? <RawRows account={account} /> : <ParsedRows account={account} label={label} />}
            </div>
        </SectionCard>
    );
}

function ParsedRows({ account, label }: { account: Account; label: string | undefined }) {
    return (
        <>
            <Row>
                <Label>Address</Label>
                <Value>
                    <Address pubkey={account.pubkey} raw />
                </Value>
            </Row>
            {label && (
                <Row>
                    <Label>Address Label</Label>
                    <Value>{label}</Value>
                </Row>
            )}
            <Row>
                <Label>Balance (SOL)</Label>
                <Value>
                    <SolBalance lamports={account.lamports} />
                </Value>
            </Row>
            {/* Assigned Program Id before Allocated Data Size so the order matches RawRows —
                the two must not swap places when toggling Raw / Parsed. */}
            <Row>
                <Label>Assigned Program Id</Label>
                <Value>
                    <Address pubkey={account.owner} link />
                </Value>
            </Row>
            {account.space !== undefined && (
                <Row>
                    <Label>Allocated Data Size</Label>
                    <Value>{account.space} byte(s)</Value>
                </Row>
            )}
            <Row>
                <Label>Executable</Label>
                <Value>{account.executable ? 'Yes' : 'No'}</Value>
            </Row>
        </>
    );
}

// Local copy of BaseRawAccountRows — same row order as the parsed rows above so Assigned Program Id /
// Allocated Data Size keep their positions across the Raw / Parsed toggle.
function RawRows({ account }: { account: Account }) {
    const { data, isLoading } = useRawAccountDataOnMount(account.pubkey);
    return (
        <>
            <Row>
                <Label>Address</Label>
                <Value>
                    <Address pubkey={account.pubkey} raw />
                </Value>
            </Row>
            <Row>
                <Label>Balance (SOL)</Label>
                <Value>
                    <SolBalance lamports={account.lamports} />
                </Value>
            </Row>
            <Row>
                <Label>Assigned Program Id</Label>
                <Value>
                    <Address pubkey={account.owner} link />
                </Value>
            </Row>
            {account.space !== undefined && (
                <Row>
                    <Label>Allocated Data Size</Label>
                    <Value>{account.space} byte(s)</Value>
                </Row>
            )}
            <Row>
                <Label>Executable</Label>
                <Value>{account.executable ? 'Yes' : 'No'}</Value>
            </Row>
            <Row>
                <Label>Raw Data</Label>
                <Value>
                    <RawDataField data={data} filename={account.pubkey.toBase58()} loading={isLoading} />
                </Value>
            </Row>
        </>
    );
}
