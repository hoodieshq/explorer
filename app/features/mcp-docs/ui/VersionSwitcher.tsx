'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/app/components/shared/utils';

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
                'absolute z-50 flex items-center gap-2 rounded-xl border border-solid border-white/10',
                'bg-[#121716]/90 px-2 py-1.5 shadow-[0px_10px_30px_-10px_#000000cc] backdrop-blur',
            )}
            style={
                pos
                    ? { left: pos.x, top: pos.y }
                    : // Pre-measurement fallback: anchor to the corner with CSS.
                      { right: MARGIN, top: MARGIN }
            }
        >
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
