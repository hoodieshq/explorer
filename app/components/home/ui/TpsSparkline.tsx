import { cn } from '@components/shared/utils';

type Props = {
    /** TPS samples, oldest first (matches performanceInfo.perfHistory). */
    data: (number | null)[];
    className?: string;
};

const W = 100;
const H = 32;

// Static SVG sparkline stretched to fill its container; no axes, no motion.
export function TpsSparkline({ data, className }: Props) {
    const points = data.map(d => d ?? 0);

    if (points.length < 2) {
        return <div className={cn('h-8 w-full', className)} aria-hidden />;
    }

    const max = Math.max(...points, 1);
    const stepX = W / (points.length - 1);
    const coords = points.map((p, i) => [i * stepX, H - (p / max) * (H - 2) - 1] as const);
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const area = `${line} L${W} ${H} L0 ${H} Z`;

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
