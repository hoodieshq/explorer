'use client';

import React, { useState } from 'react';

import { Button } from '@/app/components/shared/ui/button';

import type { Snapshot } from '../lib/types';
import { TimelineEvent } from './TimelineEvent';

const INITIAL_VISIBLE = 20;
const LOAD_MORE_COUNT = 20;

interface HistoryTimelineProps {
    snapshots: Snapshot[];
}

export function HistoryTimeline({ snapshots }: HistoryTimelineProps) {
    const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
    const [expandedIndex, setExpandedIndex] = useState<number | undefined>();

    // Show newest first for the timeline display
    const reversed = [...snapshots].reverse();
    const visible = reversed.slice(0, visibleCount);
    const hasMore = visibleCount < reversed.length;

    return (
        <div>
            <div className="e-relative e-pl-8">
                {/* Vertical timeline line */}
                <div className="e-absolute e-left-[7px] e-top-2 e-bottom-2 e-w-px e-bg-neutral-700" />

                {visible.map((snapshot, i) => {
                    // Map display index back to chronological index for previous snapshot
                    const chronologicalIndex = snapshots.length - 1 - i;
                    const previousSnapshot = chronologicalIndex > 0 ? snapshots[chronologicalIndex - 1] : undefined;

                    return (
                        <TimelineEvent
                            key={`${snapshot.event.signature}-${snapshot.event.instructionType}`}
                            isExpanded={expandedIndex === i}
                            previousSnapshot={previousSnapshot}
                            snapshot={snapshot}
                            onToggle={() => setExpandedIndex(expandedIndex === i ? undefined : i)}
                        />
                    );
                })}
            </div>

            {hasMore && (
                <div className="e-mt-4 e-flex e-justify-center">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setVisibleCount((c) => c + LOAD_MORE_COUNT)}
                    >
                        Show more ({reversed.length - visibleCount} remaining)
                    </Button>
                </div>
            )}
        </div>
    );
}
