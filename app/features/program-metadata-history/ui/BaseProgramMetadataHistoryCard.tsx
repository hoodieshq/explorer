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
import Link from 'next/link';
import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { cn } from '@/app/components/shared/utils';
import { displayTimestampUtc } from '@/app/utils/date';

import { MetadataAccountNotFoundError, type MetadataHistoryResult } from '../api/fetch-metadata-history';
import {
    getCompressionLabel,
    getDataSourceLabel,
    getEncodingLabel,
    getFormatLabel,
    getInstructionLabel,
    getInstructionSummary,
} from '../lib/labels';
import { InstructionType, type MetadataEvent, type MetadataState, type Snapshot } from '../lib/types';
import { SeedSelector } from './SeedSelector';

interface BaseProgramMetadataHistoryCardProps {
    programAddress: Address;
    seed: string;
    onSeedChange: (seed: string) => void;
    data: MetadataHistoryResult | undefined;
    isLoading: boolean;
    error: unknown;
    addressPath: string;
    txPathFor: (signature: string) => string;
}

export function BaseProgramMetadataHistoryCard({
    programAddress,
    seed,
    onSeedChange,
    data,
    isLoading,
    error,
    addressPath,
    txPathFor,
}: BaseProgramMetadataHistoryCardProps) {
    const summary = data && data.snapshots.length > 0 ? buildSummary(data.snapshots) : undefined;
    // Reconstruction is authoritative for PMP. Walk backwards to find the most recent decoded
    // content so the panel survives Close (which resets state.content to undefined) and reflects
    // "the last known content" for closed accounts.
    const currentContent = pickLatestContent(data?.snapshots);
    const meta = (
        <>
            <Link href={addressPath} className="e-font-mono e-text-teal-400 hover:e-underline">
                {truncateAddress(programAddress, 16, 8)}
            </Link>
            {data?.pdaAddress && (
                <span className="e-ml-2">
                    PDA: <span className="e-font-mono">{truncateAddress(data.pdaAddress, 8)}</span>
                </span>
            )}
        </>
    );
    const truncatedNotice = data?.truncated
        ? `History truncated at ${data.totalSignatures} signatures — older events (including the original Initialize) may be missing. Reconstructed state may be incomplete.`
        : undefined;

    return (
        <HistoryView<MetadataEvent, MetadataState>
            title="Program Metadata History"
            summary={summary}
            meta={meta}
            accessory={<SeedSelector seed={seed} onSeedChange={onSeedChange} />}
            truncatedNotice={truncatedNotice}
            aboveTimeline={<LatestContentPanel label={seed} content={currentContent} isLoading={isLoading} />}
            snapshots={data?.snapshots}
            isLoading={isLoading}
            errorMessage={error ? getErrorMessage(error) : undefined}
            emptyMessage={`No metadata history found for seed "${seed}" on this program.`}
            renderRow={args => <Row {...args} txPathFor={txPathFor} />}
        />
    );
}

const INSTRUCTION_VARIANTS: Record<InstructionType, RowVariant> = {
    [InstructionType.Allocate]: 'secondary',
    [InstructionType.Close]: 'destructive',
    [InstructionType.Extend]: 'secondary',
    [InstructionType.Initialize]: 'success',
    [InstructionType.SetAuthority]: 'warning',
    [InstructionType.SetData]: 'info',
    [InstructionType.SetImmutable]: 'destructive',
    [InstructionType.Trim]: 'warning',
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
                    {!event.failed && <DynamicSummary snapshot={snapshot} previousSnapshot={previousSnapshot} />}
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

function DynamicSummary({
    snapshot,
    previousSnapshot,
}: {
    snapshot: Snapshot;
    previousSnapshot: Snapshot | undefined;
}) {
    const { event, state } = snapshot;

    switch (event.instructionType) {
        case InstructionType.Initialize:
            return (
                <span>
                    {formatBytes(state.dataSize)}
                    {state.compression > 0 && ` · ${getCompressionLabel(state.compression)}`}
                    {state.format > 0 && `+${getFormatLabel(state.format)}`}
                </span>
            );

        case InstructionType.SetData:
            return (
                <span>
                    {formatBytes(state.dataSize)}
                    {previousSnapshot && previousSnapshot.state.dataSize !== state.dataSize && (
                        <Delta current={state.dataSize} previous={previousSnapshot.state.dataSize} leadingSpace />
                    )}
                </span>
            );

        case InstructionType.Write:
            return (
                <span>
                    +{formatBytes(event.dataLength ?? 0)} at offset {event.writeOffset?.toLocaleString() ?? '0'}
                </span>
            );

        case InstructionType.SetAuthority:
            return <span>→ {event.newAuthority ? truncateAddress(event.newAuthority) : 'removed'}</span>;

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
    const showContent =
        state.content !== undefined &&
        (event.instructionType === InstructionType.Initialize || event.instructionType === InstructionType.SetData);

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
                        {previousSnapshot && previousSnapshot.state.dataSize !== state.dataSize && (
                            <Delta current={state.dataSize} previous={previousSnapshot.state.dataSize} mono />
                        )}
                    </DetailRow>

                    <DetailRow label="Encoding">
                        <Badge variant="secondary" size="xs">
                            {getEncodingLabel(state.encoding)}
                        </Badge>
                    </DetailRow>

                    <DetailRow label="Compression">
                        <Badge variant="secondary" size="xs">
                            {getCompressionLabel(state.compression)}
                        </Badge>
                    </DetailRow>

                    <DetailRow label="Format">
                        <Badge variant="secondary" size="xs">
                            {getFormatLabel(state.format)}
                        </Badge>
                    </DetailRow>

                    <DetailRow label="Data Source">
                        <Badge variant="secondary" size="xs">
                            {getDataSourceLabel(state.dataSource)}
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

function Delta({
    current,
    previous,
    mono,
    leadingSpace,
}: {
    current: number;
    previous: number;
    mono?: boolean;
    leadingSpace?: boolean;
}) {
    const delta = current - previous;
    if (delta === 0) return undefined;
    const sign = delta > 0 ? '+' : '';
    const color = delta > 0 ? 'e-text-green-400' : 'e-text-red-400';
    return (
        <span className={cn(mono && 'e-font-mono', color)}>
            {leadingSpace ? ' (' : '('}
            {sign}
            {formatBytes(delta)})
        </span>
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

function getErrorMessage(error: unknown): string {
    if (error instanceof MetadataAccountNotFoundError) {
        return 'No metadata account found for this program and seed combination.';
    }
    if (error instanceof Error) return error.message;
    return 'An unexpected error occurred while fetching metadata history.';
}
