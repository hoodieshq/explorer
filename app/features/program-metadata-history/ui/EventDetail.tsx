'use client';

import Link from 'next/link';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { useClusterPath } from '@/app/utils/url';

import {
    COMPRESSION_LABELS,
    DATA_SOURCE_LABELS,
    ENCODING_LABELS,
    FORMAT_LABELS,
} from '../lib/constants';
import { AccountStatus, InstructionType, type Snapshot } from '../lib/types';
import { ContentDiff } from './ContentDiff';

interface EventDetailProps {
    snapshot: Snapshot;
    previousSnapshot: Snapshot | undefined;
}

export function EventDetail({ snapshot, previousSnapshot }: EventDetailProps) {
    const { state } = snapshot;
    const txPath = useClusterPath({ pathname: `/tx/${snapshot.event.signature}` });

    return (
        <div className="e-space-y-3 e-text-xs">
            <DetailRow label="Transaction">
                <Link href={txPath} className="e-font-mono e-text-teal-400 hover:e-underline">
                    {snapshot.event.signature.slice(0, 20)}...
                </Link>
            </DetailRow>

            <DetailRow label="Slot">
                <span className="e-font-mono">{snapshot.event.slot.toLocaleString()}</span>
            </DetailRow>

            {state.status === AccountStatus.Active && (
                <>
                    <DetailRow label="Data Size">
                        <span className="e-font-mono">{formatBytes(state.dataSize)}</span>
                        {previousSnapshot && previousSnapshot.state.dataSize !== state.dataSize && (
                            <DataSizeDelta current={state.dataSize} previous={previousSnapshot.state.dataSize} />
                        )}
                    </DetailRow>

                    <DetailRow label="Encoding">
                        <Badge variant="secondary" size="xs">
                            {ENCODING_LABELS[state.encoding] ?? `Unknown (${state.encoding})`}
                        </Badge>
                    </DetailRow>

                    <DetailRow label="Compression">
                        <Badge variant="secondary" size="xs">
                            {COMPRESSION_LABELS[state.compression] ?? `Unknown (${state.compression})`}
                        </Badge>
                    </DetailRow>

                    <DetailRow label="Format">
                        <Badge variant="secondary" size="xs">
                            {FORMAT_LABELS[state.format] ?? `Unknown (${state.format})`}
                        </Badge>
                    </DetailRow>

                    <DetailRow label="Data Source">
                        <Badge variant="secondary" size="xs">
                            {DATA_SOURCE_LABELS[state.dataSource] ?? `Unknown (${state.dataSource})`}
                        </Badge>
                    </DetailRow>

                    <DetailRow label="Mutable">
                        <Badge variant={state.mutable ? 'info' : 'destructive'} size="xs">
                            {state.mutable ? 'Yes' : 'No (Immutable)'}
                        </Badge>
                    </DetailRow>

                    {state.authority && (
                        <DetailRow label="Authority">
                            <span className="e-font-mono e-text-neutral-400">
                                {state.authority.slice(0, 20)}...
                            </span>
                        </DetailRow>
                    )}
                </>
            )}

            {state.status === AccountStatus.Closed && (
                <div className="e-text-red-400">Account has been closed</div>
            )}

            {hasContent(snapshot) && (
                <ContentDiff previousSnapshot={previousSnapshot} snapshot={snapshot} />
            )}
        </div>
    );
}

function hasContent(snapshot: Snapshot): boolean {
    const { instructionType } = snapshot.event;
    return (
        snapshot.state.content !== undefined &&
        (instructionType === InstructionType.Initialize || instructionType === InstructionType.SetData)
    );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="e-flex e-items-center e-gap-3">
            <span className="e-w-24 e-shrink-0 e-text-neutral-500">{label}</span>
            <div className="e-flex e-items-center e-gap-2">{children}</div>
        </div>
    );
}

function DataSizeDelta({ current, previous }: { current: number; previous: number }) {
    const delta = current - previous;
    if (delta === 0) return undefined;

    const sign = delta > 0 ? '+' : '';
    const color = delta > 0 ? 'e-text-green-400' : 'e-text-red-400';

    return <span className={`e-font-mono ${color}`}>({sign}{formatBytes(delta)})</span>;
}

function formatBytes(bytes: number): string {
    const abs = Math.abs(bytes);
    if (abs === 0) return '0 B';
    if (abs < 1024) return `${bytes} B`;
    if (abs < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
