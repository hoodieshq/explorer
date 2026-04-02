'use client';

import React from 'react';

import { AccountStatus, type Snapshot } from '../lib/types';

interface HistoryStatsProps {
    snapshots: Snapshot[];
}

export function HistoryStats({ snapshots }: HistoryStatsProps) {
    if (snapshots.length === 0) return undefined;

    const lastSnapshot = snapshots[snapshots.length - 1];
    const successfulEvents = snapshots.filter((s) => !s.event.failed);
    const firstEvent = snapshots[0];

    const currentStatus = getStatusLabel(lastSnapshot.state.status);
    const currentDataSize = lastSnapshot.state.dataSize;
    const timeSpan = getTimeSpan(firstEvent.event.blockTime);

    return (
        <div className="e-grid e-grid-cols-2 e-gap-3 sm:e-grid-cols-4">
            <StatCard label="Changes" value={String(successfulEvents.length)} />
            <StatCard label="Status" value={currentStatus} />
            <StatCard label="Data Size" value={formatBytes(currentDataSize)} />
            <StatCard label="First Change" value={timeSpan} />
        </div>
    );
}

function StatCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="e-rounded-lg e-border e-border-solid e-border-heavy-metal-950 e-bg-heavy-metal-900 e-px-4 e-py-3">
            <div className="e-text-xs e-text-neutral-500">{label}</div>
            <div className="e-mt-1 e-text-sm e-font-medium e-text-neutral-200">{value}</div>
        </div>
    );
}

function getStatusLabel(status: AccountStatus): string {
    switch (status) {
        case AccountStatus.Active:
            return 'Active';
        case AccountStatus.Buffer:
            return 'Buffer';
        case AccountStatus.Closed:
            return 'Closed';
        case AccountStatus.NonExistent:
            return 'Non-existent';
    }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getTimeSpan(blockTime: number | undefined): string {
    if (!blockTime) return 'Unknown';
    const now = Date.now() / 1000;
    const diff = now - blockTime;

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
    if (diff < 86400 * 365) return `${Math.floor(diff / (86400 * 30))}mo ago`;
    return `${(diff / (86400 * 365)).toFixed(1)}y ago`;
}
