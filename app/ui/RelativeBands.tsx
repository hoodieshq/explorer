'use client';

import { useEffect, useState } from 'react';

import { Timestamp } from '@/app/components/shared/ui/timestamp';
import { cn } from '@/app/components/shared/utils';

const MIN = 60;
const HOUR = 3600;
const DAY = 86400;

// One representative age (seconds into the past) per relative-time band in displayTimestampRelative.
const BANDS: { note: string; offset: number }[] = [
    { note: '< 1 min → seconds', offset: 25 },
    { note: '< 10 min → minutes + seconds', offset: 3 * MIN + 20 },
    { note: '10 min – 1 h → minutes', offset: 25 * MIN },
    { note: '1 – 8 h → hours + minutes', offset: 3 * HOUR + 15 * MIN },
    { note: '8 – 48 h → hours', offset: 20 * HOUR },
    { note: '48 h – 12 d → days + hours', offset: 5 * DAY + 4 * HOUR },
    { note: '12 – 30 d → days', offset: 20 * DAY },
    { note: '30 – 365 d → months + days', offset: 100 * DAY },
    { note: '1 – 3 y → years + months', offset: 400 * DAY },
    { note: '> 3 y → years', offset: 4 * 365 * DAY },
];

// A row per band, all sharing one frozen `now` (captured on mount). Passing that same reference to
// every Timestamp keeps each value exactly at its band's age — no ticking, no ±1s flicker.
export function RelativeBands() {
    const [nowSeconds, setNowSeconds] = useState<number | undefined>(undefined);
    useEffect(() => {
        setNowSeconds(Math.floor(Date.now() / 1000));
    }, []);

    // Client-only: skip SSR/first render so hydration matches (relative time depends on the clock).
    if (nowSeconds === undefined) return <></>;

    return (
        <div className="flex max-w-xl flex-col overflow-hidden rounded-lg border border-solid border-outer-space-800">
            {BANDS.map((band, index) => (
                <div
                    key={band.note}
                    className={cn(
                        'flex items-start justify-between gap-4 px-4 py-3',
                        index < BANDS.length - 1 && 'border-b border-solid border-white/10',
                    )}
                >
                    <span className="text-sm text-outer-space-300">{band.note}</span>
                    <Timestamp
                        unixTimestamp={nowSeconds - band.offset}
                        display="relative"
                        referenceMs={nowSeconds * 1000}
                    />
                </div>
            ))}
        </div>
    );
}
