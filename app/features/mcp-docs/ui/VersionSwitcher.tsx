'use client';

import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { cn } from '@/app/components/shared/utils';

import {
    CTA_FIELD_SCOPES,
    CTA_FIELD_TUNING_CONTROLS,
    type CtaFieldScope,
    getCtaFieldTuningRevision,
    loadCtaFieldTuning,
    resetCtaFieldScope,
    resolveCtaField,
    setCtaFieldValue,
    subscribeCtaFieldTuning,
} from '../lib/ctaFieldTuning';
import { MCP_DOCS_VERSIONS, type McpDocsVersion } from '../lib/useMcpDocsVersion';

/** Distance from the top-right corner where the plate first parks itself. */
const MARGIN = 16;
/** On window resize, the least clear space the plate keeps from the right edge before it's pulled in. */
const RESIZE_EDGE_GAP = 20;

/** Display labels for the switcher buttons; anything unlisted falls back to the raw version id. */
const VERSION_LABELS: Partial<Record<McpDocsVersion, string>> = { 'v3.2': '3 alt txt' };

type Point = { x: number; y: number };

/**
 * Prototype toggle shown above the docs pages while the design variants coexist.
 * It floats over the page on its own draggable plate — grab the handle and drop it
 * anywhere — so it can be moved off whatever it happens to be covering.
 */
export function VersionSwitcher({
    value,
    onChange,
}: {
    value: McpDocsVersion;
    onChange: (version: McpDocsVersion) => void;
}) {
    const plateRef = useRef<HTMLDivElement>(null);
    // Undefined until first placed, so SSR/first paint can lean on the CSS corner anchor
    // and we only switch to explicit coordinates once the real size is known.
    const [pos, setPos] = useState<Point | undefined>(undefined);
    const [dragging, setDragging] = useState(false);
    const [fieldOpen, setFieldOpen] = useState(false);
    // Pointer offset inside the plate at grab time, so it doesn't jump under the cursor.
    const grab = useRef<Point>({ x: 0, y: 0 });

    // Park the plate at the top-right corner of its positioning parent once its size is known.
    useEffect(() => {
        const plate = plateRef.current;
        if (!plate) return;
        const box = plate.getBoundingClientRect();
        const parent = plate.offsetParent ?? document.documentElement;
        setPos({ x: Math.max(MARGIN, parent.clientWidth - box.width - MARGIN), y: MARGIN });
    }, []);

    // Keep the plate on-screen when the window narrows. An absolutely-positioned plate parked near
    // the old right edge would otherwise stick out past the new width and add page-wide horizontal
    // scroll. If it no longer fits, pull it left so it keeps at least RESIZE_EDGE_GAP from the right.
    useEffect(() => {
        const onResize = () => {
            const plate = plateRef.current;
            if (!plate) return;
            const parent = plate.offsetParent ?? document.documentElement;
            const maxX = parent.clientWidth - plate.getBoundingClientRect().width - RESIZE_EDGE_GAP;
            setPos(prev => {
                if (!prev) return prev;
                const x = Math.max(MARGIN, Math.min(prev.x, maxX));
                return x === prev.x ? prev : { ...prev, x };
            });
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const onPointerDown = useCallback((event: React.PointerEvent) => {
        const plate = plateRef.current;
        if (!plate) return;
        const box = plate.getBoundingClientRect();
        grab.current = { x: event.clientX - box.left, y: event.clientY - box.top };
        setDragging(true);
        (event.target as Element).setPointerCapture(event.pointerId);
    }, []);

    const onPointerMove = useCallback(
        (event: React.PointerEvent) => {
            if (!dragging) return;
            const plate = plateRef.current;
            if (!plate) return;
            const box = plate.getBoundingClientRect();
            // Positions are relative to the plate's positioning parent (the page surface), so
            // it rides the page as it scrolls. Convert the viewport pointer into that space by
            // subtracting the parent's own viewport offset.
            const parent = plate.offsetParent ?? document.documentElement;
            const parentRect = parent.getBoundingClientRect();
            const maxX = parent.clientWidth - box.width - MARGIN;
            const maxY = parent.scrollHeight - box.height - MARGIN;
            setPos({
                x: Math.max(MARGIN, Math.min(maxX, event.clientX - grab.current.x - parentRect.left)),
                y: Math.max(MARGIN, Math.min(maxY, event.clientY - grab.current.y - parentRect.top)),
            });
        },
        [dragging],
    );

    const stopDrag = useCallback(() => setDragging(false), []);

    return (
        <div
            ref={plateRef}
            className={cn(
                'absolute z-50 flex flex-col gap-2 rounded-xl border border-solid border-white/10',
                'bg-[#121716]/90 px-2 py-1.5 shadow-[0px_10px_30px_-10px_#000000cc] backdrop-blur',
            )}
            style={
                pos
                    ? { left: pos.x, top: pos.y }
                    : // Pre-measurement fallback: anchor to the corner with CSS.
                      { right: MARGIN, top: MARGIN }
            }
        >
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    aria-label="Drag to move"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={stopDrag}
                    onPointerCancel={stopDrag}
                    className={cn(
                        'flex shrink-0 touch-none select-none items-center border-0 bg-transparent px-1 py-1 text-neutral-500 hover:text-neutral-300',
                        dragging ? 'cursor-grabbing' : 'cursor-grab',
                    )}
                >
                    <GripDots />
                </button>
                <span className="text-xs uppercase tracking-wide text-neutral-500">Version</span>
                <div className="flex overflow-hidden rounded-lg border border-solid border-white/10">
                    {MCP_DOCS_VERSIONS.map(version => (
                        <button
                            key={version}
                            type="button"
                            onClick={() => onChange(version)}
                            className={cn(
                                'cursor-pointer whitespace-nowrap border-0 px-3 py-1 text-xs font-medium uppercase transition-colors',
                                value === version
                                    ? 'bg-heavy-metal-800 text-white'
                                    : 'bg-transparent text-neutral-500 hover:text-neutral-200',
                            )}
                        >
                            {VERSION_LABELS[version] ?? version}
                        </button>
                    ))}
                </div>
                {/* The sliders retune v3's dot field; v3.2 keeps its own untouched copy of it. */}
                {value === 'v3' && (
                    <button
                        type="button"
                        onClick={() => setFieldOpen(open => !open)}
                        aria-expanded={fieldOpen}
                        className={cn(
                            'cursor-pointer rounded-lg border border-solid border-white/10 px-2 py-1',
                            'text-xs font-medium uppercase transition-colors',
                            fieldOpen
                                ? 'bg-heavy-metal-800 text-white'
                                : 'bg-transparent text-neutral-500 hover:text-neutral-200',
                        )}
                    >
                        Field
                    </button>
                )}
            </div>
            {value === 'v3' && fieldOpen && <FieldTuningPanel />}
        </div>
    );
}

/**
 * Sliders over the live dot-field values. Every drag writes straight into the shared tuning object
 * the field's rAF loop reads each frame, so the change lands on the next frame in whichever bands
 * follow the selected scope. The values survive a reload (localStorage) — a tuning session is
 * rarely one sitting — and Copy hands back a block ready to paste over that scope's defaults in
 * `ctaFieldTuning` once a set of numbers is settled on.
 */
function FieldTuningPanel() {
    // Subscribed to the revision counter, not the values: the tuning objects are mutated in place
    // so the loop can keep reading the same references.
    useSyncExternalStore(subscribeCtaFieldTuning, getCtaFieldTuningRevision, () => 0);
    const [scope, setScope] = useState<CtaFieldScope>('base');
    const [copied, setCopied] = useState(false);

    useEffect(loadCtaFieldTuning, []);

    const values = resolveCtaField(scope);

    const copy = useCallback(() => {
        const body = CTA_FIELD_TUNING_CONTROLS.map(control => `    ${control.key}: ${values[control.key]},`);
        navigator.clipboard.writeText(`{\n${body.join('\n')}\n}`).then(
            () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1200);
            },
            () => setCopied(false),
        );
    }, [values]);

    return (
        <div className="flex w-[286px] flex-col gap-1.5 border-0 border-t border-solid border-white/10 pt-2">
            {/* Which set of values the sliders write to. The page drives both bands on a phone and
                the closing band everywhere; a scope overrides it for one band on desktop. */}
            <div className="flex overflow-hidden rounded-lg border border-solid border-white/10">
                {CTA_FIELD_SCOPES.map(entry => (
                    <button
                        key={entry.key}
                        type="button"
                        onClick={() => setScope(entry.key)}
                        className={cn(
                            'flex-1 cursor-pointer whitespace-nowrap border-0 px-2 py-1 text-[10px]',
                            'font-medium uppercase tracking-wide transition-colors',
                            scope === entry.key
                                ? 'bg-heavy-metal-800 text-white'
                                : 'bg-transparent text-neutral-500 hover:text-neutral-200',
                        )}
                    >
                        {entry.label}
                    </button>
                ))}
            </div>
            <p className="m-0 text-[10px] leading-[13px] text-neutral-500">
                {CTA_FIELD_SCOPES.find(entry => entry.key === scope)?.caption}
            </p>
            {CTA_FIELD_TUNING_CONTROLS.map(control => (
                <label key={control.key} title={control.hint} className="flex items-center gap-2">
                    <span className="w-[62px] shrink-0 text-[10px] uppercase tracking-wide text-neutral-500">
                        {control.label}
                    </span>
                    <input
                        type="range"
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={values[control.key]}
                        onChange={event => setCtaFieldValue(scope, control.key, event.target.valueAsNumber)}
                        className="h-1 min-w-0 flex-1 cursor-pointer"
                        style={{ accentColor: '#1DD79B' }}
                    />
                    <span className="w-[74px] shrink-0 text-right font-mono text-[10px] tabular-nums text-neutral-300">
                        {control.format(values[control.key])}
                    </span>
                </label>
            ))}
            <div className="flex items-center justify-end gap-1.5 pt-0.5">
                <button
                    type="button"
                    onClick={() => resetCtaFieldScope(scope)}
                    className={cn(
                        'cursor-pointer rounded-md border border-solid border-white/10 bg-transparent px-2 py-0.5',
                        'text-[10px] uppercase tracking-wide text-neutral-500 hover:text-neutral-200',
                    )}
                >
                    Reset
                </button>
                <button
                    type="button"
                    onClick={copy}
                    className={cn(
                        'cursor-pointer rounded-md border border-solid border-white/10 bg-transparent px-2 py-0.5',
                        'text-[10px] uppercase tracking-wide text-neutral-500 hover:text-neutral-200',
                    )}
                >
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>
        </div>
    );
}

/** Six-dot grip, the conventional "grab me" affordance. */
function GripDots() {
    return (
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden focusable="false">
            {[3, 8, 13].map(cy => [2, 8].map(cx => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.2" />))}
        </svg>
    );
}
