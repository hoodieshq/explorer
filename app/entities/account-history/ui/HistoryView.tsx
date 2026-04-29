'use client';

import { cva } from 'class-variance-authority';
import React, { Fragment, useMemo, useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/shared/ui/card';
import { Skeleton } from '@/app/components/shared/ui/skeleton';
import { cn } from '@/app/components/shared/utils';

import type { HistoryEventBase, HistorySnapshot, HistoryStateBase } from '../lib/types';

export interface RenderRowArgs<E extends HistoryEventBase, S extends HistoryStateBase> {
    snapshot: HistorySnapshot<E, S>;
    previousSnapshot: HistorySnapshot<E, S> | undefined;
    isLatest: boolean;
    isExpanded: boolean;
    onToggle: () => void;
}

interface HistoryViewProps<E extends HistoryEventBase, S extends HistoryStateBase> {
    title: string;
    summary?: React.ReactNode;
    meta?: React.ReactNode;
    accessory?: React.ReactNode;
    truncatedNotice?: React.ReactNode;
    /** Optional panel rendered above the timeline (e.g. current decoded content). Only shown when snapshots are present. */
    aboveTimeline?: React.ReactNode;
    snapshots: HistorySnapshot<E, S>[] | undefined;
    isLoading: boolean;
    errorMessage?: string;
    emptyMessage: React.ReactNode;
    /** When true, the most recent snapshot starts expanded so its decoded content is visible on load. */
    defaultExpandLatest?: boolean;
    renderRow: (args: RenderRowArgs<E, S>) => React.ReactNode;
}

export function HistoryView<E extends HistoryEventBase, S extends HistoryStateBase>({
    title,
    summary,
    meta,
    accessory,
    truncatedNotice,
    aboveTimeline,
    snapshots,
    isLoading,
    errorMessage,
    emptyMessage,
    defaultExpandLatest,
    renderRow,
}: HistoryViewProps<E, S>) {
    return (
        <Card>
            <CardHeader>
                <div className="e-flex e-flex-col e-gap-4 sm:e-flex-row sm:e-items-start sm:e-justify-between">
                    <div>
                        <CardTitle className="e-text-lg">{title}</CardTitle>
                        {summary && <div className="e-mt-1 e-text-xs e-text-neutral-400">{summary}</div>}
                        {meta && <div className="e-mt-1 e-text-xs e-text-neutral-500">{meta}</div>}
                        {truncatedNotice && <div className="e-mt-2 e-text-xs e-text-amber-400">{truncatedNotice}</div>}
                    </div>
                    {accessory}
                </div>
            </CardHeader>

            <CardContent>
                <Body
                    snapshots={snapshots}
                    isLoading={isLoading}
                    errorMessage={errorMessage}
                    emptyMessage={emptyMessage}
                    aboveTimeline={aboveTimeline}
                    defaultExpandLatest={defaultExpandLatest}
                    renderRow={renderRow}
                />
            </CardContent>
        </Card>
    );
}

function Body<E extends HistoryEventBase, S extends HistoryStateBase>({
    snapshots,
    isLoading,
    errorMessage,
    emptyMessage,
    aboveTimeline,
    defaultExpandLatest,
    renderRow,
}: {
    snapshots: HistorySnapshot<E, S>[] | undefined;
    isLoading: boolean;
    errorMessage?: string;
    emptyMessage: React.ReactNode;
    aboveTimeline?: React.ReactNode;
    defaultExpandLatest?: boolean;
    renderRow: (args: RenderRowArgs<E, S>) => React.ReactNode;
}) {
    if (errorMessage) {
        return (
            <div className="e-rounded-lg e-border e-border-solid e-border-red-900 e-bg-red-950/30 e-p-4 e-text-sm e-text-red-400">
                {errorMessage}
            </div>
        );
    }
    if (isLoading) {
        return (
            <div className="e-space-y-6">
                {aboveTimeline}
                <TimelineSkeleton />
            </div>
        );
    }
    if (!snapshots || snapshots.length === 0) {
        return <div className="e-py-8 e-text-center e-text-sm e-text-neutral-500">{emptyMessage}</div>;
    }
    return (
        <div className="e-space-y-6">
            {aboveTimeline}
            <Timeline snapshots={snapshots} renderRow={renderRow} defaultExpandLatest={defaultExpandLatest} />
        </div>
    );
}

function Timeline<E extends HistoryEventBase, S extends HistoryStateBase>({
    snapshots,
    renderRow,
    defaultExpandLatest,
}: {
    snapshots: HistorySnapshot<E, S>[];
    renderRow: (args: RenderRowArgs<E, S>) => React.ReactNode;
    defaultExpandLatest?: boolean;
}) {
    const latestIndex = snapshots.length - 1;
    const latestKey = `${snapshots[latestIndex].event.signature}-${latestIndex}`;
    const [expandedKey, setExpandedKey] = useState<string | undefined>(defaultExpandLatest ? latestKey : undefined);

    const items = useMemo(
        () =>
            snapshots
                .map((snapshot, i) => ({
                    isLatest: i === latestIndex,
                    key: `${snapshot.event.signature}-${i}`,
                    previousSnapshot: i > 0 ? snapshots[i - 1] : undefined,
                    snapshot,
                }))
                .reverse(),
        [snapshots, latestIndex],
    );

    return (
        <div className="e-relative e-pl-8">
            <div className="e-absolute e-bottom-2 e-left-[7px] e-top-2 e-w-px e-bg-neutral-700" />
            {items.map(({ key, snapshot, previousSnapshot, isLatest }) => (
                <Fragment key={key}>
                    {renderRow({
                        isExpanded: expandedKey === key,
                        isLatest,
                        onToggle: () => setExpandedKey(prev => (prev === key ? undefined : key)),
                        previousSnapshot,
                        snapshot,
                    })}
                </Fragment>
            ))}
        </div>
    );
}

export type RowVariant = 'success' | 'info' | 'warning' | 'destructive' | 'secondary';

const rowVariants = cva('e-relative e-pb-6', {
    variants: {
        failed: {
            false: '',
            true: 'e-opacity-60',
        },
    },
});

const dotVariants = cva('e-absolute e-left-[-25px] e-top-1 e-z-10 e-h-3.5 e-w-3.5 e-rounded-full', {
    compoundVariants: [
        // Failed events lose their semantic color and ring — render as a muted dot regardless of variant.
        { className: 'e-bg-neutral-600', failed: true },
    ],
    variants: {
        failed: {
            false: 'e-ring-2 e-ring-offset-1 e-ring-offset-heavy-metal-800',
            true: '',
        },
        variant: {
            destructive: 'e-bg-red-400',
            info: 'e-bg-teal-400',
            secondary: 'e-bg-neutral-400',
            success: 'e-bg-green-400',
            warning: 'e-bg-orange-400',
        },
    },
});

interface TimelineRowProps {
    variant: RowVariant;
    failed: boolean;
    isExpanded: boolean;
    onToggle: () => void;
    header: React.ReactNode;
    summary?: React.ReactNode;
    details?: React.ReactNode;
}

export function TimelineRow({ variant, failed, isExpanded, onToggle, header, summary, details }: TimelineRowProps) {
    return (
        <div className={rowVariants({ failed })}>
            <div className={cn(dotVariants({ failed, variant }))} />

            <button
                className="e-w-full e-appearance-none e-border-0 e-bg-transparent e-p-0 e-text-left"
                onClick={onToggle}
            >
                <div className="e-flex e-flex-wrap e-items-center e-gap-2">{header}</div>

                {summary && (
                    <div className="e-mt-1 e-flex e-flex-wrap e-items-center e-gap-2 e-text-xs e-text-neutral-400">
                        {summary}
                    </div>
                )}

                <div className="e-mt-1 e-text-xs e-text-neutral-600">
                    {isExpanded ? '▾ Hide details' : '▸ View details'}
                </div>
            </button>

            {isExpanded && details && (
                <div className="e-mt-3 e-rounded-lg e-border e-border-solid e-border-heavy-metal-950 e-bg-heavy-metal-900 e-p-4">
                    {details}
                </div>
            )}
        </div>
    );
}

function TimelineSkeleton() {
    return (
        <div className="e-relative e-pl-8">
            <div className="e-absolute e-bottom-2 e-left-[7px] e-top-2 e-w-px e-bg-neutral-700" />
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="e-relative e-mb-6">
                    <div className="e-absolute e-left-[-25px] e-top-1.5 e-h-3 e-w-3 e-rounded-full e-bg-neutral-700" />
                    <Skeleton className="e-mb-2 e-h-5 e-w-40" />
                    <Skeleton className="e-mb-1 e-h-4 e-w-64" />
                    <Skeleton className="e-h-4 e-w-48" />
                </div>
            ))}
        </div>
    );
}

export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="e-flex e-items-center e-gap-3">
            <span className="e-w-24 e-shrink-0 e-text-neutral-500">{label}</span>
            <div className="e-flex e-items-center e-gap-2">{children}</div>
        </div>
    );
}

interface ContentDiffProps {
    currentContent: string | undefined;
    previousContent: string | undefined;
}

export function ContentDiff({ currentContent, previousContent }: ContentDiffProps) {
    const [viewMode, setViewMode] = useState<'diff' | 'full'>('diff');

    const hasDiff = currentContent !== previousContent && previousContent !== undefined && currentContent !== undefined;

    if (!currentContent) {
        return (
            <div className="e-rounded-lg e-border e-border-solid e-border-heavy-metal-950 e-bg-heavy-metal-900 e-p-4 e-text-xs e-text-neutral-500">
                Content could not be decoded at this point.
            </div>
        );
    }

    return (
        <div className="e-mt-3 e-overflow-hidden e-rounded-lg e-border e-border-solid e-border-heavy-metal-950">
            <div className="e-flex e-items-center e-justify-between e-border-b e-border-solid e-border-heavy-metal-950 e-bg-heavy-metal-900 e-px-3 e-py-2">
                <span className="e-text-xs e-text-neutral-400">{hasDiff ? 'Content changes' : 'Content'}</span>
                {hasDiff && (
                    <div className="e-flex e-gap-1">
                        <ModeButton active={viewMode === 'diff'} label="Diff" onClick={() => setViewMode('diff')} />
                        <ModeButton active={viewMode === 'full'} label="Full" onClick={() => setViewMode('full')} />
                    </div>
                )}
            </div>
            <div className="e-max-h-[500px] e-overflow-auto">
                {viewMode === 'diff' && hasDiff ? (
                    <DiffView newValue={currentContent} oldValue={previousContent ?? ''} />
                ) : (
                    <pre className="e-m-0 e-whitespace-pre-wrap e-break-words e-bg-heavy-metal-950 e-p-3 e-font-mono e-text-xs e-text-neutral-300">
                        {currentContent}
                    </pre>
                )}
            </div>
        </div>
    );
}

function DiffView({ oldValue, newValue }: { oldValue: string; newValue: string }) {
    const styles = useMemo(
        () => ({
            contentText: { fontSize: '11px', lineHeight: '1.5' },
            diffContainer: { background: '#0d1117', borderRadius: 0 },
            diffRemoved: { background: 'rgba(248, 81, 73, 0.1)' },
            emptyLine: { background: '#0d1117' },
            gutter: { background: '#161b22', color: '#484f58', fontSize: '11px', minWidth: '40px', padding: '0 8px' },
            line: { fontSize: '11px' },
            marker: { display: 'none' as const },
            wordAdded: { background: 'rgba(63, 185, 80, 0.3)' },
            wordDiff: { padding: 0 },
            wordRemoved: { background: 'rgba(248, 81, 73, 0.3)' },
        }),
        [],
    );

    return (
        <div className="diff-viewer-wrapper">
            <style>{`
                .diff-viewer-wrapper table { width: 100% !important; table-layout: auto !important; }
                .diff-viewer-wrapper td:last-child { width: 100% !important; }
                .diff-viewer-wrapper pre { white-space: pre-wrap !important; word-break: break-all !important; }
            `}</style>
            <ReactDiffViewer
                compareMethod={DiffMethod.LINES}
                newValue={newValue}
                oldValue={oldValue}
                splitView={false}
                styles={styles}
                useDarkTheme
            />
        </div>
    );
}

/**
 * Walk a snapshot list backwards and return the most recent decoded content. Used by features
 * to populate the current-content panel — survives Close (PMP) and post-SetBuffer (Anchor)
 * because it doesn't require the latest snapshot to have content.
 */
export function pickLatestContent<E extends HistoryEventBase, S extends HistoryStateBase>(
    snapshots: HistorySnapshot<E, S>[] | undefined,
): string | undefined {
    return snapshots?.filter(s => s.state.content !== undefined).at(-1)?.state.content;
}

interface LatestContentPanelProps {
    /** Sub-label rendered next to the "Latest Content" title (e.g. "idl", "anchor"). */
    label: string;
    /** Decoded content. When undefined and `isLoading` is false the panel renders nothing. */
    content: string | undefined;
    isLoading: boolean;
}

/**
 * "Latest Content" panel for the `aboveTimeline` slot. Renders a skeleton while loading, the
 * decoded content once available, and nothing otherwise. Both pmp and anchor features use it.
 *
 * "Latest" rather than "Current": for closed accounts or post-Close states the panel still
 * shows the most-recently decoded value (`pickLatestContent` walks the snapshot list back),
 * which may not reflect what's on-chain right now.
 */
export function LatestContentPanel({ label, content, isLoading }: LatestContentPanelProps): React.ReactNode {
    if (isLoading)
        return (
            <LatestContentFrame label={label}>
                <LatestContentSkeleton />
            </LatestContentFrame>
        );
    if (content === undefined) return undefined;
    return (
        <LatestContentFrame label={label}>
            <pre className="e-m-0 e-whitespace-pre-wrap e-break-words e-p-4 e-font-mono e-text-xs e-text-neutral-300">
                {content}
            </pre>
        </LatestContentFrame>
    );
}

function LatestContentSkeleton() {
    return (
        <div className="e-space-y-2 e-p-4">
            {['e-w-full', 'e-w-5/6', 'e-w-3/4', 'e-w-4/5', 'e-w-2/3', 'e-w-5/6'].map((w, i) => (
                <Skeleton key={i} className={cn('e-h-3', w)} />
            ))}
        </div>
    );
}

function LatestContentFrame({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="e-rounded-lg e-border e-border-solid e-border-heavy-metal-950 e-bg-heavy-metal-900">
            <div className="e-flex e-items-center e-justify-between e-border-b e-border-solid e-border-heavy-metal-950 e-px-4 e-py-3">
                <span className="e-text-sm e-font-medium e-text-neutral-200">Latest Content</span>
                <span className="e-text-xs e-text-neutral-500">{label}</span>
            </div>
            <div className="e-h-[200px] e-overflow-auto">{children}</div>
        </div>
    );
}

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button
            className={cn(
                'e-appearance-none e-rounded e-border e-border-solid e-px-2 e-py-0.5 e-text-[10px]',
                active
                    ? 'e-border-teal-700 e-bg-teal-900/50 e-text-teal-400'
                    : 'e-border-neutral-700 e-bg-transparent e-text-neutral-500 hover:e-text-neutral-300',
            )}
            onClick={onClick}
        >
            {label}
        </button>
    );
}
