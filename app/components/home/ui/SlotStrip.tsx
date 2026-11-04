'use client';

import { cn } from '@components/shared/utils';
import { ClusterStatsStatus, useDashboardInfo } from '@providers/stats/solanaClusterStats';
import { useBuildClusterPath } from '@utils/url';
import useTabVisibility from '@utils/use-tab-visibility';
import Link from 'next/link';
import React from 'react';

import { useReducedMotion } from '@/app/shared/lib/use-reduced-motion';

import { advanceHead, buildSlotWindow, clampCadence, MAX_TILES, resyncHead } from '../lib/slot-strip';

export function SlotStrip() {
    const { epochInfo, msPerSlot_1h, status } = useDashboardInfo();
    const reduced = useReducedMotion();
    const { visible } = useTabVisibility();
    const buildPath = useBuildClusterPath();

    const realSlot = epochInfo.absoluteSlot;
    const [head, setHead] = React.useState<bigint>(realSlot);

    // Resync to each real poll; the head never moves backwards.
    React.useEffect(() => {
        setHead(prev => resyncHead(prev, realSlot));
    }, [realSlot]);

    // Interpolate the ~400ms slot cadence between the 2s epoch-info polls. Paused under reduced motion
    // or a hidden tab; capped at MAX_DRIFT slots ahead of the last real value so it can never run away.
    React.useEffect(() => {
        if (reduced || !visible || status !== ClusterStatsStatus.Ready || realSlot === 0n) return;
        const id = setInterval(() => {
            setHead(prev => advanceHead(prev, realSlot));
        }, clampCadence(msPerSlot_1h));
        return () => clearInterval(id);
    }, [reduced, visible, status, realSlot, msPerSlot_1h]);

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

            <ol role="list" className="flex list-none justify-end gap-2 overflow-hidden p-0">
                {slots.map((slot, i) =>
                    slot === undefined ? (
                        <li
                            key={`skeleton-${i}`}
                            aria-hidden
                            className="bg-heavy-metal-800/50 h-12 w-[92px] shrink-0 rounded-lg border border-solid border-outer-space-800"
                        />
                    ) : (
                        <li key={slot.toString()} className="shrink-0">
                            <Link
                                href={buildPath(`/block/${slot}`)}
                                title={`Slot ${slot.toLocaleString('en-US')}`}
                                className={cn(
                                    'flex h-12 w-[92px] flex-col items-center justify-center rounded-lg no-underline',
                                    'border border-solid border-outer-space-700 bg-heavy-metal-800',
                                    'transition-colors hover:border-dark-accent',
                                    i === slots.length - 1 && 'border-dark-accent/60',
                                    !reduced && 'duration-500 animate-in fade-in slide-in-from-right-3',
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
                    ),
                )}
            </ol>
        </section>
    );
}
