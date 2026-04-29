'use client';

import {
    AccountStatus,
    ContentDiff,
    DetailRow,
    formatBytes,
    formatRelativeTime,
    getStatusLabel,
    HistoryView,
    LatestContentPanel,
    pickLatestContent,
    type RowVariant,
    TimelineRow,
} from '@entities/account-history';
import { truncateAddress } from '@entities/address';
import { type Address } from '@solana/kit';
import { SYSTEM_PROGRAM_ADDRESS } from '@solana-program/system';
import Link from 'next/link';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { displayTimestampUtc } from '@/app/utils/date';

import type { AnchorIdlHistoryResult } from '../api/fetch-idl-history';
import { getInstructionLabel, getInstructionSummary } from '../lib/labels';
import { type AnchorIdlEvent, type AnchorIdlState, InstructionType, type Snapshot } from '../lib/types';

interface BaseAnchorIdlHistoryCardProps {
    programAddress: Address;
    data: AnchorIdlHistoryResult | undefined;
    isLoading: boolean;
    error: unknown;
    addressPath: string;
    txPathFor: (signature: string) => string;
}

export function BaseAnchorIdlHistoryCard({
    programAddress,
    data,
    isLoading,
    error,
    addressPath,
    txPathFor,
}: BaseAnchorIdlHistoryCardProps) {
    const summary = data && data.snapshots.length > 0 ? buildSummary(data.snapshots) : undefined;
    // Reconstruction is authoritative (Write events accumulate, SetBuffer is bridged via
    // foreign-buffer replay), so the latest decoded content stands in for "current state".
    const latestContent = pickLatestContent(data?.snapshots);

    const meta = (
        <>
            <Link href={addressPath} className="e-font-mono e-text-teal-400 hover:e-underline">
                {truncateAddress(programAddress, 16, 8)}
            </Link>
            {data?.idlAddress && (
                <span className="e-ml-2">
                    IDL account: <span className="e-font-mono">{truncateAddress(data.idlAddress, 8)}</span>
                </span>
            )}
        </>
    );
    const truncatedNotice = data?.truncated
        ? `History truncated at ${data.totalSignatures} signatures — older events (including the original Initialize) may be missing. Reconstructed state may be incomplete.`
        : undefined;

    return (
        <HistoryView<AnchorIdlEvent, AnchorIdlState>
            title="Anchor IDL History"
            summary={summary}
            meta={meta}
            truncatedNotice={truncatedNotice}
            aboveTimeline={<LatestContentPanel label="anchor" content={latestContent} isLoading={isLoading} />}
            snapshots={data?.snapshots}
            isLoading={isLoading}
            errorMessage={error ? getErrorMessage(error) : undefined}
            emptyMessage={renderEmptyMessage(data)}
            renderRow={args => <Row {...args} txPathFor={txPathFor} />}
        />
    );
}

const INSTRUCTION_VARIANTS: Record<InstructionType, RowVariant> = {
    [InstructionType.Close]: 'destructive',
    [InstructionType.Create]: 'success',
    [InstructionType.CreateBuffer]: 'secondary',
    [InstructionType.Resize]: 'secondary',
    [InstructionType.SetAuthority]: 'warning',
    [InstructionType.SetBuffer]: 'info',
    [InstructionType.Write]: 'info',
};

function Row({
    snapshot,
    previousSnapshot,
    isExpanded,
    onToggle,
    txPathFor,
}: {
    snapshot: Snapshot;
    previousSnapshot: Snapshot | undefined;
    isExpanded: boolean;
    onToggle: () => void;
    txPathFor: (sig: string) => string;
}) {
    const { event } = snapshot;
    const variant = INSTRUCTION_VARIANTS[event.instructionType];

    return (
        <TimelineRow
            variant={variant}
            failed={event.failed}
            isExpanded={isExpanded}
            onToggle={onToggle}
            header={
                <>
                    <Badge variant={event.failed ? 'secondary' : variant}>
                        {getInstructionLabel(event.instructionType)}
                    </Badge>
                    {event.failed && (
                        <Badge variant="destructive" size="xs">
                            Failed
                        </Badge>
                    )}
                    <span className="e-font-mono e-text-xs e-text-neutral-500">Slot {event.slot.toLocaleString()}</span>
                </>
            }
            summary={
                <>
                    {event.blockTime && <span>{displayTimestampUtc(event.blockTime * 1000, true)}</span>}
                    {!event.failed && <DynamicSummary snapshot={snapshot} />}
                </>
            }
            details={
                <RowDetails
                    snapshot={snapshot}
                    previousSnapshot={previousSnapshot}
                    txPath={txPathFor(event.signature)}
                />
            }
        />
    );
}

function DynamicSummary({ snapshot }: { snapshot: Snapshot }) {
    const { event, state } = snapshot;

    switch (event.instructionType) {
        case InstructionType.Resize:
            return <span>resized to {formatBytes(event.dataLen ?? 0)}</span>;

        case InstructionType.Write:
            return (
                <span>
                    +{formatBytes(event.dataLength ?? 0)} (total {formatBytes(state.dataSize)})
                </span>
            );

        case InstructionType.SetAuthority:
            // Anchor encodes "make immutable" as SetAuthority(SYSTEM_PROGRAM_ADDRESS) — surface
            // that case as a human-readable label instead of the system-program base58.
            return (
                <span>
                    →{' '}
                    {event.newAuthority === SYSTEM_PROGRAM_ADDRESS
                        ? 'made immutable'
                        : event.newAuthority && truncateAddress(event.newAuthority)}
                </span>
            );

        default: {
            const summary = getInstructionSummary(event.instructionType);
            return summary ? <span>{summary}</span> : undefined;
        }
    }
}

function RowDetails({
    snapshot,
    previousSnapshot,
    txPath,
}: {
    snapshot: Snapshot;
    previousSnapshot: Snapshot | undefined;
    txPath: string;
}) {
    const { event, state } = snapshot;
    // Both Write and SetBuffer "introduce" content into the IDL account — Write appends,
    // SetBuffer copies a foreign buffer that the fetcher pre-resolved.
    const isContentIntroducingEvent =
        event.instructionType === InstructionType.Write || event.instructionType === InstructionType.SetBuffer;
    const showContent = state.content !== undefined && isContentIntroducingEvent;

    return (
        <div className="e-space-y-3 e-text-xs">
            <DetailRow label="Transaction">
                <Link href={txPath} className="e-font-mono e-text-teal-400 hover:e-underline">
                    {truncateAddress(event.signature, 8)}
                </Link>
            </DetailRow>

            <DetailRow label="Slot">
                <span className="e-font-mono">{event.slot.toLocaleString()}</span>
            </DetailRow>

            {state.status === AccountStatus.Active && (
                <>
                    <DetailRow label="Data Size">
                        <span className="e-font-mono">{formatBytes(state.dataSize)}</span>
                    </DetailRow>

                    <DetailRow label="Mutable">
                        <Badge variant={state.mutable ? 'info' : 'destructive'} size="xs">
                            {state.mutable ? 'Yes' : 'No (Immutable)'}
                        </Badge>
                    </DetailRow>

                    {state.authority && (
                        <DetailRow label="Authority">
                            <span className="e-font-mono e-text-neutral-400">
                                {truncateAddress(state.authority, 8)}
                            </span>
                        </DetailRow>
                    )}
                </>
            )}

            {state.status === AccountStatus.Closed && <div className="e-text-red-400">Account has been closed</div>}

            {showContent && (
                <ContentDiff currentContent={state.content} previousContent={previousSnapshot?.state.content} />
            )}
        </div>
    );
}

function buildSummary(snapshots: Snapshot[]): string {
    const latest = snapshots[snapshots.length - 1];
    const first = snapshots[0];
    const successCount = snapshots.filter(s => !s.event.failed).length;
    const parts = [
        getStatusLabel(latest.state.status),
        formatBytes(latest.state.dataSize),
        `${successCount} ${successCount === 1 ? 'change' : 'changes'}`,
        `first ${formatRelativeTime(first.event.blockTime)}`,
    ];
    return parts.join(' · ');
}

function renderEmptyMessage(data: { idlAddress: Address; totalSignatures: number } | undefined): React.ReactNode {
    // Reaching this path requires `isLoading=false` (HistoryView's Body short-circuits on loading)
    // *and* `snapshots` to be empty/undefined — so when the SWR fetcher hasn't surfaced data yet
    // there's nothing meaningful to render and we leave it blank.
    if (!data) return undefined;

    if (data.totalSignatures === 0) {
        return (
            <div className="e-space-y-3">
                <div>No transactions found at the Anchor IDL account.</div>
                <div className="e-font-mono e-text-[11px] e-text-neutral-600">{data.idlAddress}</div>
            </div>
        );
    }

    return (
        <div className="e-space-y-3 e-text-left">
            <div className="e-text-center">
                Found {data.totalSignatures} transactions on the IDL account, but none parsed as Anchor IDL
                instructions.
            </div>
        </div>
    );
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    return 'Failed to load Anchor IDL history.';
}
