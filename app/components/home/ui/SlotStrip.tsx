'use client';

import { cn } from '@components/shared/utils';
import { ClusterStatsStatus, useDashboardInfo } from '@providers/stats/solanaClusterStats';
import { useBuildClusterPath } from '@utils/url';
import useTabVisibility from '@utils/use-tab-visibility';
import Link from 'next/link';
import React from 'react';

import { useReducedMotion } from '@/app/shared/lib/use-reduced-motion';

import { buildSlotWindow, CALM_CADENCE_MS, MAX_TILES, SNAP_THRESHOLD, stepHead } from '../lib/slot-strip';

export function SlotStrip() {
    const { epochInfo, status } = useDashboardInfo();
    const reduced = useReducedMotion();
    const { visible } = useTabVisibility();
    const buildPath = useBuildClusterPath();

    const realSlot = epochInfo.absoluteSlot;
    const [head, setHead] = React.useState<bigint>(realSlot);

    // Latest polled slot, read by the interval without re-creating it each 2s poll.
    const targetRef = React.useRef(realSlot);
    targetRef.current = realSlot;

    // Snap on first data or a large desync (e.g. the tab was hidden and the slot jumped far ahead).
    React.useEffect(() => {
        setHead(prev => (prev === 0n || realSlot - prev > SNAP_THRESHOLD ? realSlot : prev));
    }, [realSlot]);

    // Advance the head one calm step at a time toward the latest poll, so the numbers tick gently
    // instead of flickering at the real slot rate. Paused under reduced motion or a hidden tab.
    React.useEffect(() => {
        if (reduced || !visible || status !== ClusterStatsStatus.Ready) return;
        const id = setInterval(() => setHead(prev => stepHead(prev, targetRef.current)), CALM_CADENCE_MS);
        return () => clearInterval(id);
    }, [reduced, visible, status]);

    if (status === ClusterStatsStatus.Error) return undefined;

    const loading = status !== ClusterStatsStatus.Ready || head <= 0n;

    const slots: (bigint | undefined)[] = loading
        ? Array.from({ length: MAX_TILES }, () => undefined)
        : buildSlotWindow(head);

    return (
        <section aria-label="Most recent slots" className="w-full">
            <div className="mb-2 flex items-center gap-2">
                <span className="relative flex h-2 w-2" aria-hidden>
                    <span
                        className={cn(
                            'absolute inline-flex h-full w-full rounded-full bg-dark-accent opacity-60',
                            !reduced && 'animate-ping',
                        )}
                    />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-dark-accent" />
                </span>
                <span className="font-mono text-xs uppercase tracking-widest text-heavy-metal-300">Live slots</span>
            </div>

            <ol role="list" className="flex list-none gap-2 p-0">
                {slots.map((slot, i) => {
                    const vis = tileVisibility(slots.length - 1 - i);
                    return slot === undefined ? (
                        <li
                            key={`skeleton-${i}`}
                            aria-hidden
                            className={cn('bg-heavy-metal-800/50 h-12 min-w-0 flex-1 rounded-lg', vis)}
                        />
                    ) : (
                        <li key={slot.toString()} className={cn('min-w-0 flex-1', vis)}>
                            <Link
                                href={buildPath(`/block/${slot}`)}
                                title={`Slot ${slot.toLocaleString('en-US')}`}
                                className={cn(
                                    'flex h-12 w-full flex-col items-center justify-center rounded-lg no-underline',
                                    'border border-solid border-outer-space-700 bg-heavy-metal-800',
                                    'transition-colors hover:border-dark-accent',
                                    i === slots.length - 1 && 'border-dark-accent/60',
                                )}
                            >
                                <span className="font-mono text-[10px] uppercase tracking-wide text-heavy-metal-400">
                                    Slot
                                </span>
                                <span className="font-mono text-xs text-dark-foreground">
                                    {slot.toLocaleString('en-US')}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ol>
        </section>
    );
}

// Keep the strip full-width and balanced at every breakpoint: always show the newest few tiles, reveal
// older ones only as the viewport widens. Position is measured from the right (0 = newest).
function tileVisibility(posFromRight: number): string {
    if (posFromRight <= 2) return 'flex';
    if (posFromRight <= 4) return 'hidden sm:flex';
    if (posFromRight <= 5) return 'hidden md:flex';
    return 'hidden lg:flex';
}
