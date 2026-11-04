'use client';

import { TimestampToggle } from '@components/common/TimestampToggle';
import { cn } from '@components/shared/utils';
import { useSupply } from '@features/supply';
import { useVoteAccounts } from '@features/vote/model/vote-accounts';
import { ClusterStatsStatus, useDashboardInfo, usePerformanceInfo } from '@providers/stats/solanaClusterStats';
import { abbreviatedNumber, lamportsToSol, slotsToHumanString } from '@utils/index';
import { percentage } from '@utils/math';
import React from 'react';

import { Card } from '@/app/shared/ui/Card';

import { EpochRing } from './EpochRing';
import { TpsSparkline } from './TpsSparkline';

const CELL = 'rounded-xl border border-solid border-heavy-metal-950 bg-heavy-metal-800 p-5';
const CELL_LABEL = 'font-mono text-xs uppercase tracking-widest text-heavy-metal-400';

export function NetworkStats() {
    return (
        <section aria-label="Network statistics" className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <EpochCell />
                <TpsCell />
                <SupplyStakeCell />
            </div>
            <SecondaryStats />
        </section>
    );
}

function CellShell({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className={CELL}>
            <div className={CELL_LABEL}>{label}</div>
            <div className="mt-4">{children}</div>
        </div>
    );
}

function CellPlaceholder({ label, error }: { label: string; error?: boolean }) {
    return (
        <CellShell label={label}>
            <div className="flex h-24 items-center text-sm text-heavy-metal-400">
                {error ? 'Unavailable' : 'Loading…'}
            </div>
        </CellShell>
    );
}

function EpochCell() {
    const info = useDashboardInfo();
    if (info.status !== ClusterStatsStatus.Ready) {
        return <CellPlaceholder label="Epoch" error={info.status === ClusterStatsStatus.Error} />;
    }

    const { epochInfo, msPerSlot_1h } = info;
    const { slotIndex, slotsInEpoch, epoch } = epochInfo;
    const progress = slotsInEpoch > 0n ? Number(slotIndex) / Number(slotsInEpoch) : 0;
    const pct = `${percentage(slotIndex, slotsInEpoch, 2).toFixed(1)}%`;
    const remaining = slotsToHumanString(Number(slotsInEpoch - slotIndex), msPerSlot_1h);

    return (
        <CellShell label="Epoch">
            <div className="flex items-center gap-4">
                <EpochRing progress={progress} label={pct} sublabel={`epoch ${epoch}`} />
                <div className="min-w-0">
                    <div className="font-mono text-2xl text-dark-foreground" aria-label={`Epoch ${epoch}`}>
                        {epoch.toLocaleString('en-US')}
                    </div>
                    <div className="mt-1 text-sm text-heavy-metal-400">~{remaining} remaining</div>
                </div>
            </div>
        </CellShell>
    );
}

function TpsCell() {
    const perf = usePerformanceInfo();
    if (perf.status !== ClusterStatsStatus.Ready) {
        return <CellPlaceholder label="Transactions per second" error={perf.status === ClusterStatsStatus.Error} />;
    }

    const tps = Math.round(perf.avgTps ?? 0).toLocaleString('en-US');

    return (
        <CellShell label="Transactions per second">
            <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-3xl text-dark-foreground" aria-label={`${tps} transactions per second`}>
                    {tps}
                </span>
                <span className="text-sm text-heavy-metal-400">
                    {abbreviatedNumber(Number(perf.transactionCount))} total
                </span>
            </div>
            <div className="mt-4">
                <TpsSparkline data={perf.perfHistory.short} />
            </div>
        </CellShell>
    );
}

function SupplyStakeCell() {
    const supplyState = useSupply();
    const voteAccounts = useVoteAccounts();

    if (supplyState.kind === 'loading') return <CellPlaceholder label="Supply & stake" />;
    if (supplyState.kind !== 'ready') return <CellPlaceholder label="Supply & stake" error />;

    const { supply } = supplyState;
    if (supply.total === 0n) return <CellPlaceholder label="Supply & stake" error />;

    const circulatingPct = percentage(supply.circulating, supply.total, 2);
    const stake = voteAccounts.kind === 'ready' ? voteAccounts.stake : undefined;
    const stakePct = stake ? percentage(stake.active, supply.total, 2) : undefined;

    return (
        <CellShell label="Supply & stake">
            <div className="flex flex-col gap-4">
                <Bar
                    title="Circulating"
                    pct={circulatingPct}
                    value={`${sol(supply.circulating)} / ${sol(supply.total)}`}
                />
                <Bar
                    title="Active stake"
                    pct={stakePct}
                    value={stake ? `${sol(stake.active)} / ${sol(supply.total)}` : 'Loading…'}
                    muted
                />
            </div>
        </CellShell>
    );
}

function Bar({ title, pct, value, muted }: { title: string; pct?: number; value: string; muted?: boolean }) {
    return (
        <div>
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <span className="text-sm text-heavy-metal-200">{title}</span>
                <span className="font-mono text-xs text-heavy-metal-400">{value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-outer-space-800">
                <div
                    className={cn('h-full rounded-full', muted ? 'bg-dark-accent/50' : 'bg-dark-accent')}
                    style={{ width: `${Math.min(100, pct ?? 0)}%` }}
                    role="progressbar"
                    aria-label={`${title} ${pct !== undefined ? `${pct.toFixed(1)}%` : 'unknown'}`}
                    aria-valuenow={pct !== undefined ? Math.round(pct) : undefined}
                    aria-valuemin={0}
                    aria-valuemax={100}
                />
            </div>
        </div>
    );
}

function SecondaryStats() {
    const info = useDashboardInfo();
    if (info.status !== ClusterStatsStatus.Ready) return undefined;

    const { epochInfo, msPerSlot_1h, blockTime } = info;

    return (
        <Card ui="tw" className="grid grid-cols-2 gap-x-6 gap-y-4 p-5 sm:grid-cols-4">
            <MiniStat label="Slot" value={epochInfo.absoluteSlot.toLocaleString('en-US')} />
            <MiniStat label="Block height" value={epochInfo.blockHeight.toLocaleString('en-US')} />
            <MiniStat label="Slot time (1h)" value={`${msPerSlot_1h}ms`} />
            <MiniStat
                label="Cluster time"
                value={blockTime ? <TimestampToggle unixTimestamp={blockTime} shorter /> : '—'}
            />
        </Card>
    );
}

function MiniStat({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="min-w-0">
            <div className="text-xs text-heavy-metal-400">{label}</div>
            <div className="mt-1 truncate font-mono text-sm text-dark-foreground">{value}</div>
        </div>
    );
}

function sol(value: bigint): string {
    return abbreviatedNumber(lamportsToSol(value)) ?? '0';
}
