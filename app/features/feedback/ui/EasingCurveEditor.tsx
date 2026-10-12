'use client';

import { type PointerEvent, useEffect, useRef, useState } from 'react';

import { Input } from '@/app/components/shared/ui/input';
import { cn } from '@/app/components/shared/utils';

import type { CubicBezier } from '../model/morph-tuning';

// REVIEW(HOO-1815): part of the design menu's easing editor; remove with it.

/** A cubic-bezier curve with two draggable control points, its four numbers as text, and a few presets. */
export function EasingCurveEditor({ value, onChange }: { value: CubicBezier; onChange: (value: CubicBezier) => void }) {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dragging, setDragging] = useState<0 | 1>();
    const [x1, y1, x2, y2] = value;

    const pointAt = (event: PointerEvent): [number, number] | undefined => {
        const rect = svgRef.current?.getBoundingClientRect();
        if (!rect) return undefined;
        // The drawing is scaled to the menu's width; back to its own units first.
        const scale = WIDTH / rect.width;
        const x = ((event.clientX - rect.left) * scale - PAD_X) / PLOT_WIDTH;
        const y = Y_MAX - ((event.clientY - rect.top) * scale - PAD_Y) / PLOT_HEIGHT;
        // Time only runs forwards, so x stays in 0..1; y may overshoot both ways.
        return [round(clamp(x, 0, 1)), round(clamp(y, Y_MIN, Y_MAX))];
    };

    const move = (event: PointerEvent) => {
        if (dragging === undefined) return;
        const point = pointAt(event);
        if (!point) return;
        onChange(dragging === 0 ? [point[0], point[1], x2, y2] : [x1, y1, point[0], point[1]]);
    };

    return (
        <div className="flex flex-col gap-2">
            <svg
                ref={svgRef}
                className="w-full touch-none select-none rounded-md bg-outer-space-950"
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                onPointerMove={move}
                onPointerUp={() => setDragging(undefined)}
                onPointerCancel={() => setDragging(undefined)}
            >
                {/* The start and end values: the curve leaves the first and lands on the second. */}
                {[0, 1].map(level => (
                    <line
                        key={level}
                        className="stroke-outer-space-700"
                        strokeDasharray="3 3"
                        x1={PAD_X}
                        x2={PAD_X + PLOT_WIDTH}
                        y1={toY(level)}
                        y2={toY(level)}
                    />
                ))}
                <line className="stroke-outer-space-500" x1={toX(0)} x2={toX(x1)} y1={toY(0)} y2={toY(y1)} />
                <line className="stroke-outer-space-500" x1={toX(1)} x2={toX(x2)} y1={toY(1)} y2={toY(y2)} />
                <path
                    className="stroke-dark-accent"
                    d={`M ${toX(0)} ${toY(0)} C ${toX(x1)} ${toY(y1)}, ${toX(x2)} ${toY(y2)}, ${toX(1)} ${toY(1)}`}
                    fill="none"
                    strokeWidth={2}
                />
                {(
                    [
                        [x1, y1],
                        [x2, y2],
                    ] as const
                ).map(([x, y], index) => (
                    <circle
                        key={index}
                        className={cn(
                            'cursor-grab fill-white stroke-dark-accent active:cursor-grabbing',
                            dragging === index && 'fill-dark-accent',
                        )}
                        cx={toX(x)}
                        cy={toY(y)}
                        r={7}
                        strokeWidth={2}
                        onPointerDown={event => {
                            svgRef.current?.setPointerCapture(event.pointerId);
                            setDragging(index as 0 | 1);
                        }}
                    />
                ))}
            </svg>
            <BezierInput value={value} onChange={onChange} />
            <div className="flex flex-wrap gap-1">
                {PRESETS.map(preset => (
                    <button
                        key={preset.label}
                        type="button"
                        className="cursor-pointer rounded border border-solid border-outer-space-700 bg-transparent px-1.5 py-0.5 text-[11px] text-neutral-300 hover:border-outer-space-500 hover:text-white"
                        onClick={() => onChange(preset.value)}
                    >
                        {preset.label}
                    </button>
                ))}
            </div>
        </div>
    );
}

/** The four numbers as editable text, applied on Enter or when the field loses focus. */
function BezierInput({ value, onChange }: { value: CubicBezier; onChange: (value: CubicBezier) => void }) {
    const [text, setText] = useState(format(value));
    // The handles move the curve too, so the text follows the value unless it is being typed.
    const typingRef = useRef(false);
    useEffect(() => {
        if (!typingRef.current) setText(format(value));
    }, [value]);

    const apply = () => {
        typingRef.current = false;
        const parsed = parse(text);
        if (parsed) onChange(parsed);
        else setText(format(value));
    };

    return (
        <Input
            aria-label="Cubic bezier"
            className="!h-7 font-mono !text-xs"
            spellCheck={false}
            value={text}
            variant="dark"
            onBlur={apply}
            onChange={event => {
                typingRef.current = true;
                setText(event.target.value);
            }}
            onKeyDown={event => {
                if (event.key === 'Enter') apply();
            }}
        />
    );
}

const WIDTH = 256;
const PAD_X = 12;
const PAD_Y = 10;
const PLOT_WIDTH = WIDTH - 2 * PAD_X;
const PLOT_HEIGHT = 96;
// Room above and below the 0..1 band, for curves that overshoot or pull back.
const Y_MIN = -0.4;
const Y_MAX = 1.4;
const HEIGHT = (Y_MAX - Y_MIN) * PLOT_HEIGHT + 2 * PAD_Y;

const PRESETS: { label: string; value: CubicBezier }[] = [
    { label: 'linear', value: [0, 0, 1, 1] },
    { label: 'ease', value: [0.25, 0.1, 0.25, 1] },
    { label: 'ease-in', value: [0.42, 0, 1, 1] },
    { label: 'ease-out', value: [0, 0, 0.58, 1] },
    { label: 'ease-in-out', value: [0.42, 0, 0.58, 1] },
    { label: 'back-out', value: [0.34, 1.56, 0.64, 1] },
];

function toX(x: number): number {
    return PAD_X + x * PLOT_WIDTH;
}

function toY(y: number): number {
    return PAD_Y + (Y_MAX - y) * PLOT_HEIGHT;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function round(value: number): number {
    return Math.round(value * 100) / 100;
}

function format(value: CubicBezier): string {
    return value.join(', ');
}

function parse(text: string): CubicBezier | undefined {
    // Takes a pasted `cubic-bezier(…)` too.
    const numbers = text
        .replaceAll('cubic-bezier', '')
        .replaceAll('(', '')
        .replaceAll(')', '')
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .map(Number);
    if (numbers.length !== 4 || numbers.some(Number.isNaN)) return undefined;
    const [x1, y1, x2, y2] = numbers;
    return [clamp(x1, 0, 1), y1, clamp(x2, 0, 1), y2];
}
