import { cn } from '@components/shared/utils';

import { sparklinePaths } from '../lib/charts';

type Props = {
    /** TPS samples, oldest first (matches performanceInfo.perfHistory). */
    data: (number | null)[];
    className?: string;
};

const W = 100;
const H = 32;

// Static SVG sparkline stretched to fill its container; no axes, no motion.
export function TpsSparkline({ data, className }: Props) {
    const paths = sparklinePaths(data, W, H);

    if (!paths) {
        return <div className={cn('h-8 w-full', className)} aria-hidden />;
    }

    const { area, line } = paths;

    return (
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn('h-8 w-full', className)} aria-hidden>
            <path d={area} fill="currentColor" className="text-dark-accent/10" />
            <path
                d={line}
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="text-dark-accent"
            />
        </svg>
    );
}
