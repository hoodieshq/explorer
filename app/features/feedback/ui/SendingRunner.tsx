'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { canAnimate, prefersReducedMotion } from './motion-support';

/**
 * A short glowing dash that runs round its parent, `gap` px outside its edge, while the feedback sends: the parent
 * needs `position: relative`, and `radius` is its corner radius. The dash keeps one length and one speed all the way
 * round, corners included, as both are measured off the parent's real box.
 *
 * Outside, not on the edge: it runs round the Submit button, whose green would hide a green dash. Keep the gap within
 * the padding around the parent: the popup scrolls, and anything reaching past it gives the popup scrollbars.
 */
export function SendingRunner({ radius, gap = 3 }: { radius: number; gap?: number }) {
    const svgRef = useRef<SVGSVGElement>(null);
    const rectRef = useRef<SVGRectElement>(null);
    const [size, setSize] = useState<{ width: number; height: number }>();

    useLayoutEffect(() => {
        const parent = svgRef.current?.parentElement;
        if (!parent) return;
        const measure = () => setSize({ height: parent.offsetHeight + 2 * gap, width: parent.offsetWidth + 2 * gap });
        measure();
        if (typeof ResizeObserver !== 'function') return;
        const observer = new ResizeObserver(measure);
        observer.observe(parent);
        return () => observer.disconnect();
    }, [gap]);

    // The stroke is centred `gap` px out from the parent's edge, its corners on the parent's curve grown by the gap.
    const inset = STROKE / 2;
    const width = Math.max(0, (size?.width ?? 0) - STROKE);
    const height = Math.max(0, (size?.height ?? 0) - STROKE);
    const r = Math.max(0, radius + gap - inset);
    const perimeter = 2 * (width - 2 * r) + 2 * (height - 2 * r) + 2 * Math.PI * r;
    const dash = Math.min(perimeter * DASH_SHARE, DASH_MAX);
    const still = prefersReducedMotion();

    useLayoutEffect(() => {
        const rect = rectRef.current;
        if (!rect || !perimeter || still || !canAnimate()) return;
        // The speed in px per second stays the same on a small popup and a large one.
        const animation = rect.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: -perimeter }], {
            duration: (perimeter / SPEED) * 1000,
            iterations: Infinity,
        });
        return () => animation.cancel();
    }, [perimeter, still]);

    return (
        <svg
            ref={svgRef}
            aria-hidden="true"
            className="pointer-events-none absolute overflow-visible drop-shadow-[0_0_4px_#1dd79b]"
            // Sized in the style, not by attributes: the button sizes every svg in it as an icon (`[&_svg]:size-3`),
            // and only an inline style outranks that.
            style={{ height: size?.height, left: -gap, top: -gap, width: size?.width }}
        >
            {size && (
                <rect
                    ref={rectRef}
                    className="stroke-dark-accent"
                    data-testid="sending-runner-dash"
                    fill="none"
                    height={height}
                    rx={r}
                    // Asked for less motion, the whole outline lights up instead of a dash running round it.
                    strokeDasharray={still ? undefined : `${dash} ${perimeter - dash}`}
                    strokeLinecap="round"
                    strokeWidth={STROKE}
                    width={width}
                    x={inset}
                    y={inset}
                />
            )}
        </svg>
    );
}

const STROKE = 2;
// The dash: a quarter of the way round, but never longer than this on a wide button.
const DASH_SHARE = 0.25;
const DASH_MAX = 120;
// px per second: about once round the Submit button a second.
const SPEED = 320;
