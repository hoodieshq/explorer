'use client';

import React from 'react';

import { Badge } from '@/app/components/shared/ui/badge';
import { displayTimestampUtc } from '@/app/utils/date';

import {
    INSTRUCTION_BADGE_VARIANT,
    INSTRUCTION_DOT_COLOR,
    INSTRUCTION_LABELS,
} from '../lib/constants';
import { InstructionType, type Snapshot } from '../lib/types';
import { EventDetail } from './EventDetail';

interface TimelineEventProps {
    snapshot: Snapshot;
    previousSnapshot: Snapshot | undefined;
    isExpanded: boolean;
    onToggle: () => void;
}

export function TimelineEvent({ snapshot, previousSnapshot, isExpanded, onToggle }: TimelineEventProps) {
    const { event } = snapshot;
    const dotColor = event.failed ? 'e-bg-neutral-600' : INSTRUCTION_DOT_COLOR[event.instructionType];
    const ringColor = event.failed ? '' : 'e-ring-2 e-ring-offset-1 e-ring-offset-heavy-metal-800';

    return (
        <div className={`e-relative e-pb-6 ${event.failed ? 'e-opacity-60' : ''}`}>
            {/* Dot on timeline */}
            <div
                className={`e-absolute e-left-[-25px] e-top-1 e-h-3.5 e-w-3.5 e-rounded-full ${dotColor} ${ringColor} e-z-10`}
            />

            {/* Event content */}
            <button
                className="e-w-full e-appearance-none e-border-0 e-bg-transparent e-p-0 e-text-left"
                onClick={onToggle}
            >
                {/* Header row */}
                <div className="e-flex e-flex-wrap e-items-center e-gap-2">
                    <Badge variant={event.failed ? 'secondary' : INSTRUCTION_BADGE_VARIANT[event.instructionType]}>
                        {INSTRUCTION_LABELS[event.instructionType]}
                    </Badge>

                    {event.failed && (
                        <Badge variant="destructive" size="xs">
                            Failed
                        </Badge>
                    )}

                    <span className="e-font-mono e-text-xs e-text-neutral-500">
                        Slot {event.slot.toLocaleString()}
                    </span>
                </div>

                {/* Timestamp + summary */}
                <div className="e-mt-1 e-flex e-flex-wrap e-items-center e-gap-2 e-text-xs e-text-neutral-400">
                    {event.blockTime && (
                        <span>{displayTimestampUtc(event.blockTime * 1000, true)}</span>
                    )}

                    {!event.failed && <EventSummary snapshot={snapshot} previousSnapshot={previousSnapshot} />}
                </div>

                {/* Expand hint */}
                <div className="e-mt-1 e-text-xs e-text-neutral-600">
                    {isExpanded ? '▾ Hide details' : '▸ View details'}
                </div>
            </button>

            {/* Expanded detail */}
            {isExpanded && (
                <div className="e-mt-3 e-rounded-lg e-border e-border-solid e-border-heavy-metal-950 e-bg-heavy-metal-900 e-p-4">
                    <EventDetail snapshot={snapshot} previousSnapshot={previousSnapshot} />
                </div>
            )}
        </div>
    );
}

function EventSummary({ snapshot, previousSnapshot }: { snapshot: Snapshot; previousSnapshot: Snapshot | undefined }) {
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
                        <DeltaText current={state.dataSize} previous={previousSnapshot.state.dataSize} />
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
            return (
                <span>
                    → {event.newAuthority ? `${event.newAuthority.slice(0, 8)}...` : 'removed'}
                </span>
            );

        case InstructionType.SetImmutable:
            return <span>Locked permanently</span>;

        case InstructionType.Close:
            return <span>Account closed</span>;

        case InstructionType.Allocate:
            return <span>Buffer allocated</span>;

        case InstructionType.Extend:
            return <span>Account extended</span>;

        case InstructionType.Trim:
            return <span>Account trimmed</span>;

        default:
            return undefined;
    }
}

function DeltaText({ current, previous }: { current: number; previous: number }) {
    const delta = current - previous;
    if (delta === 0) return undefined;
    const sign = delta > 0 ? '+' : '';
    const color = delta > 0 ? 'e-text-green-400' : 'e-text-red-400';
    return <span className={color}> ({sign}{formatBytes(delta)})</span>;
}

function formatBytes(bytes: number): string {
    const abs = Math.abs(bytes);
    if (abs === 0) return '0 B';
    if (abs < 1024) return `${bytes} B`;
    if (abs < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getCompressionLabel(compression: number): string {
    const labels: Record<number, string> = { 1: 'gzip', 2: 'zlib' };
    return labels[compression] ?? 'compressed';
}

function getFormatLabel(format: number): string {
    const labels: Record<number, string> = { 1: 'json', 2: 'yaml', 3: 'toml' };
    return labels[format] ?? '';
}
