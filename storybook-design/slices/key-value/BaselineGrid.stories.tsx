import type { Meta, StoryObj } from '@storybook-config/types';
import React from 'react';

import { Label } from './Label';
import { LABEL_SHIM, type LabelSize, type LineBox } from './tokens';

// Verification harness for the baseline shim. Each row is one standardized line-box with a
// 4px background grid; a size S/M/L label sits next to L-sized body text. If the shim is
// correct, the bottom of every glyph (its baseline) lands on the same grid line as the body
// text's baseline. Tune LABEL_SHIM in tokens.ts until they coincide, then delete guesswork.
const GRID_BG: React.CSSProperties = {
    // inline gradient — tailwind gradient utils render nothing in this project
    backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0, transparent 3px, rgba(29,215,155,0.35) 3px, rgba(29,215,155,0.35) 4px)',
};

const SIZES: LabelSize[] = ['s', 'm', 'l', 'xl'];

function GridRow({ lineBox, zoom }: { lineBox: LineBox; zoom: number }) {
    const stripRef = React.useRef<HTMLDivElement>(null);
    const markerRef = React.useRef<HTMLSpanElement>(null);
    const [baseline, setBaseline] = React.useState<number | null>(null);

    // Measured baseline: an empty inline-block marker (vertical-align:baseline) sits with its
    // box on the reference text's baseline, so marker.top − strip.top is the baseline offset
    // from the top of the line-box. Divide by zoom to report content px. Re-measure once the
    // font loads (otherwise a fallback font's metrics leak in).
    React.useLayoutEffect(() => {
        const measure = () => {
            const s = stripRef.current;
            const m = markerRef.current;
            if (s && m) setBaseline((m.getBoundingClientRect().top - s.getBoundingClientRect().top) / zoom);
        };
        measure();
        let cancelled = false;
        document.fonts?.ready.then(() => !cancelled && measure());
        return () => {
            cancelled = true;
        };
    }, [zoom, lineBox]);

    return (
        <div>
            <div className="mb-1 text-dk-sm text-dk-gray-700">
                line-box {lineBox} (baseline {baseline === null ? '…' : `${baseline.toFixed(2)}px`})
            </div>
            <div
                ref={stripRef}
                data-linebox={lineBox}
                style={GRID_BG}
                className="flex w-max items-baseline gap-6 whitespace-nowrap text-dk-white"
            >
                {SIZES.filter(size => LABEL_SHIM[size][lineBox]).map(size => (
                    <Label key={size} size={size} lineBox={lineBox}>
                        size {size.toUpperCase()}
                    </Label>
                ))}
                <span style={{ fontSize: 15, lineHeight: `${lineBox}px` }}>
                    body text (L)
                    <span
                        ref={markerRef}
                        style={{ display: 'inline-block', height: 0, verticalAlign: 'baseline', width: 0 }}
                    />
                </span>
            </div>
        </div>
    );
}

const meta = {
    component: GridRow,
    parameters: { layout: 'padded' },
    title: 'Design Slices/key-value/BaselineGrid',
} satisfies Meta<typeof GridRow>;

export default meta;
type Story = StoryObj<typeof meta>;

// A zoom control that scales only the content via CSS `zoom` (inspect alignment up close
// without zooming the browser window) + a draggable red ruler. The ruler is a fixed, full-
// viewport-width overlay that stays 1 *screen* pixel thick at any zoom, but its position is
// tracked in content pixels (snaps to 1 content px), so it reads against the zoomed grid and
// follows the content when scrolled. screenTop = wrapperTop + lineY × zoom.
function BaselineGridPlayground() {
    const [zoom, setZoom] = React.useState(2);
    const [lineY, setLineY] = React.useState(60); // content px
    const [wrapTop, setWrapTop] = React.useState(0); // wrapper's screen-space top
    // Each line-box strip in content coords: { lineBox, top, height } — used to report the
    // line's position relative to the strip it hovers (top of that line-box = 0).
    const [rows, setRows] = React.useState<{ lineBox: number; top: number; height: number }[]>([]);
    const wrapRef = React.useRef<HTMLDivElement>(null);
    const grabOffset = React.useRef(0); // content px between cursor and line at grab time

    // Keep the wrapper's on-screen top + measured strip geometry in sync (scroll / resize / zoom).
    React.useLayoutEffect(() => {
        const update = () => {
            const el = wrapRef.current;
            if (!el) return;
            const base = el.getBoundingClientRect().top;
            setWrapTop(base);
            setRows(
                [...el.querySelectorAll<HTMLElement>('[data-linebox]')].map(strip => {
                    const r = strip.getBoundingClientRect();
                    return { height: r.height / zoom, lineBox: Number(strip.dataset.linebox), top: (r.top - base) / zoom };
                }),
            );
        };
        update();
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [zoom]);

    // pointer clientY (screen px) → content px, undoing the wrapper's top offset + zoom
    const contentY = (clientY: number) => (clientY - wrapTop) / zoom;
    const onPointerDown = (e: React.PointerEvent) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        grabOffset.current = contentY(e.clientY) - lineY;
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        setLineY(Math.max(0, Math.round(contentY(e.clientY) - grabOffset.current))); // snap 1 content px
    };

    const screenTop = wrapTop + lineY * zoom;
    // Which line-box strip is the line currently over, and how far from its top (content px).
    const over = rows.find(r => lineY >= r.top && lineY < r.top + r.height);

    return (
        <div className="relative">
            <div className="sticky top-0 z-[100] mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 bg-dk-gray-800-dark py-2 text-dk-white">
                <div className="flex items-center gap-2 text-dk-sm">
                    Zoom
                    {[1, 2, 4, 8].map(level => {
                        const active = zoom === level;
                        return (
                            <button
                                key={level}
                                onClick={() => setZoom(level)}
                                className="cursor-pointer rounded border border-solid px-2 py-0.5 text-dk-sm"
                                style={{
                                    // inline colors: these dk utilities aren't scanned by Tailwind outside app/
                                    background: active ? '#1dd79b' : 'transparent',
                                    borderColor: active ? '#1dd79b' : '#282d2b',
                                    color: active ? '#141816' : '#698582',
                                }}
                            >
                                {level}×
                            </button>
                        );
                    })}
                </div>
                <span className="text-dk-sm text-dk-gray-700">
                    {over ? (
                        <>
                            line-box {over.lineBox} · y{' '}
                            <span className="tabular-nums text-dk-white">
                                {Math.round(lineY - over.top)}
                            </span>
                            {' / '}
                            {over.lineBox}px
                        </>
                    ) : (
                        <>line is outside a line-box</>
                    )}
                </span>
                <span className="text-dk-sm text-dk-gray-700">drag the red line · snaps to 1 content px</span>
            </div>

            <div ref={wrapRef} style={{ zoom }}>
                <div className="flex flex-col gap-8">
                    <GridRow lineBox={16} zoom={zoom} />
                    <GridRow lineBox={20} zoom={zoom} />
                    <GridRow lineBox={24} zoom={zoom} />
                    <GridRow lineBox={32} zoom={zoom} />
                    <GridRow lineBox={36} zoom={zoom} />
                    <GridRow lineBox={40} zoom={zoom} />
                </div>
            </div>

            {/* Fixed full-viewport ruler: 9px transparent grab strip, 1px screen-thick line centered.
                Position is derived from the content coordinate, so it snaps to the zoomed grid. */}
            <div
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                className="fixed left-0 right-0 z-[200]"
                style={{ cursor: 'ns-resize', height: 9, top: screenTop - 4 }}
            >
                <div className="absolute left-0 right-0" style={{ background: '#FFA696', height: 1, top: 4 }} />
            </div>
        </div>
    );
}

export const AllLineBoxes: Story = {
    render: () => <BaselineGridPlayground />,
};
