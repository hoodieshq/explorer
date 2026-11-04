import { cn } from '@components/shared/utils';

import { ringDashOffset } from '../lib/charts';

type Props = {
    /** Progress in the range 0–1. */
    progress: number;
    label: string;
    sublabel?: string;
    className?: string;
};

const SIZE = 104;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

// Static SVG ring — the offset reflects the current epoch progress with no draw-in animation.
export function EpochRing({ progress, label, sublabel, className }: Props) {
    const offset = ringDashOffset(progress, C);

    return (
        <div className={cn('relative shrink-0', className)} style={{ height: SIZE, width: SIZE }}>
            <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={R}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={STROKE}
                    className="text-outer-space-800"
                />
                <circle
                    cx={SIZE / 2}
                    cy={SIZE / 2}
                    r={R}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={STROKE}
                    strokeLinecap="round"
                    strokeDasharray={C}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                    className="text-dark-accent"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-lg leading-none text-dark-foreground">{label}</span>
                {sublabel && <span className="mt-1 text-[10px] text-heavy-metal-400">{sublabel}</span>}
            </div>
        </div>
    );
}
