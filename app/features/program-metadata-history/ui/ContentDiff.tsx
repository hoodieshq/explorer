'use client';

import React, { useMemo, useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';

import type { Snapshot } from '../lib/types';

interface ContentDiffProps {
    snapshot: Snapshot;
    previousSnapshot: Snapshot | undefined;
}

export function ContentDiff({ snapshot, previousSnapshot }: ContentDiffProps) {
    const [viewMode, setViewMode] = useState<'diff' | 'full'>('diff');

    const currentContent = snapshot.state.content;
    const previousContent = previousSnapshot?.state.content;

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
                <span className="e-text-xs e-text-neutral-400">
                    {hasDiff ? 'Content changes' : 'Content'}
                </span>
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

function ModeButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
    return (
        <button
            className={`e-appearance-none e-rounded e-border e-border-solid e-px-2 e-py-0.5 e-text-[10px] ${
                active
                    ? 'e-border-teal-700 e-bg-teal-900/50 e-text-teal-400'
                    : 'e-border-neutral-700 e-bg-transparent e-text-neutral-500 hover:e-text-neutral-300'
            }`}
            onClick={onClick}
        >
            {label}
        </button>
    );
}
