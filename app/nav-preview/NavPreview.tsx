'use client';

import { cn } from '@components/shared/utils';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_PREVIEW_WIDTH_ID, MIN_PREVIEW_HEIGHT, MIN_PREVIEW_WIDTH, PREVIEW_WIDTHS } from './preview-widths';
import { SERVICE_PAGES } from './service-pages';

const STORAGE_KEY = 'explorer:navPreviewFrame';
const MODE_KEY = 'explorer:navPreviewMode';

/** `page` frames the app path this route was given; `service` frames a review surface instead. */
type Mode = 'page' | 'service';

function readMode(): { id?: string; mode: Mode } | undefined {
    try {
        const raw = localStorage.getItem(MODE_KEY);
        if (!raw) return undefined;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return undefined;
        const mode = Reflect.get(parsed, 'mode');
        if (mode !== 'page' && mode !== 'service') return undefined;
        const id = Reflect.get(parsed, 'id');
        return { id: typeof id === 'string' ? id : undefined, mode };
    } catch {
        return undefined;
    }
}

type Side = 'bottom' | 'left' | 'right' | 'top';

/** An absent dimension means "fill the stage on that axis"; `id: 'custom'` is what a width drag leaves. */
interface Selection {
    height?: number;
    id: string;
    width?: number;
}

const DEFAULT_SELECTION: Selection = {
    id: DEFAULT_PREVIEW_WIDTH_ID,
    width: PREVIEW_WIDTHS.find(w => w.id === DEFAULT_PREVIEW_WIDTH_ID)?.width,
};

/** A stored dimension is optional; anything present but not a finite number makes the whole value junk. */
function readDimension(value: unknown): number | undefined | 'invalid' {
    if (value === undefined) return undefined;
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'invalid';
    return value;
}

function readStored(): Selection | undefined {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return undefined;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return undefined;
        if (!('id' in parsed) || typeof parsed.id !== 'string') return undefined;
        // `Reflect.get` rather than indexing: the keys are not on the narrowed type, and this repo bans
        // type assertions.
        const width = readDimension(Reflect.get(parsed, 'width'));
        const height = readDimension(Reflect.get(parsed, 'height'));
        if (width === 'invalid' || height === 'invalid') return undefined;
        return { height, id: parsed.id, width };
    } catch {
        return undefined;
    }
}

/**
 * A stored preset keeps its *id*, never its width: the widths shift whenever the breakpoint table or the
 * base/activation convention changes, and a selection written before such a change would otherwise pin
 * the old number while the chip beside it claims the new one. Only `custom` — a dragged width answering
 * to no preset — is taken at face value. An id no longer in the table falls back to the default.
 */
function reconcile(selection: Selection): Selection {
    if (selection.id === 'custom') return selection;
    const preset = PREVIEW_WIDTHS.find(w => w.id === selection.id);
    if (!preset) return { ...DEFAULT_SELECTION, height: selection.height };
    return { height: selection.height, id: preset.id, width: preset.width };
}

function writeStored(selection: Selection): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
    } catch {
        /* storage unavailable — the choice still holds for this page view */
    }
}

/**
 * Harness for reviewing the navigation at each breakpoint. The frame is an iframe, not a narrow `div`,
 * and that is the whole point: every responsive utility in this app is a viewport `@media` query — there
 * are no container queries anywhere in the codebase — so a 375px-wide *element* on a 1400px screen still
 * renders the desktop navbar. Only a real nested viewport makes `lg:` and friends switch.
 *
 * The drag is lifted from the prism (ALX_LOCAL/prism/index.html), which solved the same two problems:
 * pointer capture on the handle so the iframe cannot swallow the move stream mid-drag, and a
 * requestAnimationFrame batch so a pointermove does not thrash layout on every event.
 *
 * Resizing never reloads the frame — the src does not change — so the inner document keeps its state and
 * just re-evaluates its media queries as it reflows.
 *
 * `fixed inset-0` rather than page content, so this route's own copy of the app chrome is covered
 * instead of sitting confusingly above the navbar under review. `z-[1500]` keeps it below the variant
 * plaque at `z-[2000]`, so variants stay switchable while previewing: the plaque and the frame are
 * separate documents on one origin, and the variant atom syncs across them through the storage event
 * its `atomWithStorage` already subscribes to.
 */
export function NavPreview({ path }: { path: string }) {
    const stageRef = useRef<HTMLDivElement>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION);
    const [stage, setStage] = useState({ height: 0, width: 0 });
    const [dragging, setDragging] = useState<'x' | 'y' | undefined>(undefined);
    const [mode, setMode] = useState<Mode>('page');
    // An id written by an earlier build can name a page that no longer exists, so the registry has the
    // final say and an unknown id resolves to the first entry rather than a blank frame.
    const [serviceId, setServiceId] = useState<string | undefined>(undefined);
    /**
     * How much wider/taller the frame element has to be for the *inner* viewport to hit the target: a
     * classic scrollbar is subtracted from `window.innerWidth` inside the frame, and that inner number is
     * what the frame's media queries answer to. Without this a `lg · 993` chip yields a 978px viewport on
     * a platform with classic scrollbars and the desktop layout never appears — the whole point missed by
     * a scrollbar's width. Zero where scrollbars are overlays.
     */
    const [gutter, setGutter] = useState({ x: 0, y: 0 });
    /** The target size, so a drag measures the size that was asked for rather than the padded element. */
    const targetRef = useRef({ height: 0, width: 0 });
    /** What the frame's own viewport actually ended up as — the number the readout can be trusted on. */
    const [innerSize, setInnerSize] = useState<{ height: number; width: number } | undefined>(undefined);

    // Read after mount, not during render, so the server-rendered markup is not contradicted.
    useEffect(() => {
        const stored = readStored();
        if (stored) setSelection(reconcile(stored));
        const storedMode = readMode();
        if (storedMode) {
            setMode(storedMode.mode);
            setServiceId(storedMode.id);
        }
    }, []);

    useEffect(() => {
        const element = stageRef.current;
        if (!element) return;
        const observer = new ResizeObserver(([entry]) =>
            setStage({ height: entry.contentRect.height, width: entry.contentRect.width }),
        );
        observer.observe(element);
        return () => observer.disconnect();
    }, []);

    const startResize = useCallback(
        (side: Side) => (event: React.PointerEvent<HTMLButtonElement>) => {
            if (event.button !== 0) return;
            event.preventDefault();

            const vertical = side === 'top' || side === 'bottom';
            const handle = event.currentTarget;
            const stageBox = stageRef.current?.getBoundingClientRect();
            const start = vertical ? event.clientY : event.clientX;
            // The target, not the rendered box: the box carries the scrollbar gutter, and measuring it
            // would add that gutter to the target on every drag.
            const startSize = vertical ? targetRef.current.height : targetRef.current.width;
            const stageSize = (vertical ? stageBox?.height : stageBox?.width) ?? startSize;
            const limit = stageSize - (vertical ? gutter.y : gutter.x);
            const floor = vertical ? MIN_PREVIEW_HEIGHT : MIN_PREVIEW_WIDTH;
            // Grows towards the pointer: dragging the left or top edge outward means a *negative* delta.
            const sign = side === 'right' || side === 'bottom' ? 1 : -1;

            // Keeps move/up flowing to the handle even as the cursor crosses the iframe, which would
            // otherwise swallow them and stall the drag.
            try {
                handle.setPointerCapture(event.pointerId);
            } catch {
                /* capture unsupported — the drag still works while the cursor stays off the frame */
            }
            setDragging(vertical ? 'y' : 'x');

            let pending: number | undefined;
            let raf = 0;
            const apply = (size: number): Selection =>
                vertical ? { ...selection, height: size } : { ...selection, id: 'custom', width: size };
            const flush = () => {
                raf = 0;
                if (pending !== undefined) setSelection(apply(Math.round(pending)));
            };
            const onMove = (moveEvent: PointerEvent) => {
                const delta = ((vertical ? moveEvent.clientY : moveEvent.clientX) - start) * sign;
                // ×2: the frame is centred on both axes, so one edge moving by `delta` changes the size by
                // twice that while the opposite edge mirrors — the cursor stays on the edge it grabbed.
                pending = Math.max(floor, Math.min(limit, startSize + delta * 2));
                if (!raf) raf = requestAnimationFrame(flush);
            };
            const onUp = (upEvent: PointerEvent) => {
                handle.removeEventListener('pointermove', onMove);
                handle.removeEventListener('pointerup', onUp);
                handle.removeEventListener('pointercancel', onUp);
                try {
                    handle.releasePointerCapture(upEvent.pointerId);
                } catch {
                    /* already released */
                }
                if (raf) cancelAnimationFrame(raf);
                flush();
                setDragging(undefined);
                if (pending !== undefined) writeStored(apply(Math.round(pending)));
            };

            handle.addEventListener('pointermove', onMove);
            handle.addEventListener('pointerup', onUp);
            handle.addEventListener('pointercancel', onUp);
        },
        [selection, gutter],
    );

    // A width chip leaves the dragged height alone: the two axes are independent controls.
    const commit = useCallback(
        (next: Pick<Selection, 'id' | 'width'>) => {
            const merged = { ...next, height: selection.height };
            setSelection(merged);
            writeStored(merged);
        },
        [selection.height],
    );

    // `fill`, and any stored size larger than today's stage, both resolve to the space on offer.
    const frameWidth = selection.width
        ? Math.min(selection.width, (stage.width || selection.width) - gutter.x)
        : stage.width;
    const frameHeight = selection.height
        ? Math.min(selection.height, (stage.height || selection.height) - gutter.y)
        : stage.height;
    targetRef.current = { height: frameHeight, width: frameWidth };

    const service = SERVICE_PAGES.find(sp => sp.id === serviceId) ?? SERVICE_PAGES[0];
    // `page` keeps the route's own path; `service` swaps in a review surface. Only the src changes — the
    // width chips, the drag handles and the readout all apply either way, since a gallery is worth
    // seeing at each breakpoint too.
    const framedPath = mode === 'service' && service ? service.path : path;

    const commitMode = useCallback(
        (nextMode: Mode, nextId?: string) => {
            setMode(nextMode);
            if (nextId !== undefined) setServiceId(nextId);
            try {
                localStorage.setItem(MODE_KEY, JSON.stringify({ id: nextId ?? serviceId, mode: nextMode }));
            } catch {
                /* storage unavailable — the choice still holds for this page view */
            }
        },
        [serviceId],
    );

    // Same-origin, so the frame's own viewport is readable. Runs after every size change because the
    // scrollbar can appear or vanish with the content the new size produces.
    const measureInner = useCallback(() => {
        const win = iframeRef.current?.contentWindow;
        const box = iframeRef.current?.getBoundingClientRect();
        if (!win || !box) return;
        setInnerSize({ height: win.innerHeight, width: win.innerWidth });
        // Clamped: a sane scrollbar is well under 40px, and a wild value here would feed back into the
        // element's size on the next render.
        const x = Math.round(box.width - win.innerWidth);
        const y = Math.round(box.height - win.innerHeight);
        setGutter(current => {
            const next = { x: x > 0 && x < 40 ? x : 0, y: y > 0 && y < 40 ? y : 0 };
            return next.x === current.x && next.y === current.y ? current : next;
        });
    }, []);

    useEffect(() => {
        const id = requestAnimationFrame(measureInner);
        return () => cancelAnimationFrame(id);
    }, [measureInner, frameWidth, frameHeight, framedPath]);

    return (
        <div className="fixed inset-0 z-[1500] flex flex-col bg-heavy-metal-950">
            <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center px-6 py-6">
                {/* The handles are children of *this* box, not the stage, so they ride the frame's own
                    edges instead of parking at the screen edge whenever the frame is narrower than the
                    stage. Its size is the target plus the scrollbar gutter, so the iframe's own viewport
                    lands on the target the chip names. */}
                <div
                    ref={frameRef}
                    className="relative flex flex-col"
                    style={{
                        height: frameHeight ? frameHeight + gutter.y : '100%',
                        width: frameWidth ? frameWidth + gutter.x : '100%',
                    }}
                >
                    {/* The frame edge is an `outline`, not a `border`, and there is no wrapper between this
                        box and the iframe. Preflight makes everything `border-box`, so a 1px border on a
                        `w-full` wrapper handed the iframe two pixels less than the chip promised — enough
                        for `lg · 993` to render at 991 and never cross Tailwind's `min-width: 993`. An
                        outline draws outside the layout and cannot repeat that.

                        Inline rather than Tailwind's `outline-*`: utilities in this project have gone
                        silently no-op before, and this one is load-bearing for the frame being visible. */}
                    <iframe
                        ref={iframeRef}
                        src={framedPath}
                        title="Navigation preview"
                        onLoad={measureInner}
                        className="h-full w-full rounded-lg border-0 bg-heavy-metal-850"
                        style={{ outline: '1px solid rgba(255,255,255,0.1)', outlineOffset: '-1px' }}
                    />

                    <ResizeHandle side="left" dragging={dragging} onPointerDown={startResize('left')} />
                    <ResizeHandle side="right" dragging={dragging} onPointerDown={startResize('right')} />
                    <ResizeHandle side="top" dragging={dragging} onPointerDown={startResize('top')} />
                    <ResizeHandle side="bottom" dragging={dragging} onPointerDown={startResize('bottom')} />
                </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-3 border-0 border-t border-solid border-white/10 bg-[#121716]/95 px-4 py-2 backdrop-blur">
                <div className="flex overflow-hidden rounded-lg border border-solid border-white/10">
                    {(['page', 'service'] as const).map(m => (
                        <button
                            key={m}
                            type="button"
                            aria-pressed={mode === m}
                            onClick={() => commitMode(m)}
                            className={cn(
                                'cursor-pointer whitespace-nowrap border-0 px-3 py-1 text-xs font-medium uppercase transition-colors',
                                mode === m
                                    ? 'bg-heavy-metal-800 text-white'
                                    : 'bg-transparent text-neutral-500 hover:text-neutral-200',
                            )}
                        >
                            {m}
                        </button>
                    ))}
                </div>

                {mode === 'service' && (
                    <div className="flex flex-wrap overflow-hidden rounded-lg border border-solid border-white/10">
                        {SERVICE_PAGES.map(sp => (
                            <button
                                key={sp.id}
                                type="button"
                                title={`${sp.note} (${sp.path})`}
                                aria-pressed={service?.id === sp.id}
                                onClick={() => commitMode('service', sp.id)}
                                className={cn(
                                    'cursor-pointer whitespace-nowrap border-0 px-3 py-1 text-xs font-medium uppercase transition-colors',
                                    service?.id === sp.id
                                        ? 'bg-heavy-metal-800 text-white'
                                        : 'bg-transparent text-neutral-500 hover:text-neutral-200',
                                )}
                            >
                                {sp.label}
                            </button>
                        ))}
                    </div>
                )}

                <span className="whitespace-nowrap text-xs uppercase tracking-wide text-neutral-500">Width</span>

                <div className="flex flex-wrap overflow-hidden rounded-lg border border-solid border-white/10">
                    {PREVIEW_WIDTHS.map(({ id, label, width }) => (
                        <button
                            key={id}
                            type="button"
                            aria-pressed={selection.id === id}
                            onClick={() => commit({ id, width })}
                            className={cn(
                                'cursor-pointer whitespace-nowrap border-0 px-3 py-1 text-xs font-medium uppercase transition-colors',
                                selection.id === id
                                    ? 'bg-heavy-metal-800 text-white'
                                    : 'bg-transparent text-neutral-500 hover:text-neutral-200',
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {selection.height !== undefined && (
                    <button
                        type="button"
                        onClick={() => commit({ id: selection.id, width: selection.width })}
                        className="cursor-pointer whitespace-nowrap rounded-lg border border-solid border-white/10 bg-transparent px-3 py-1 text-xs font-medium uppercase text-neutral-500 transition-colors hover:text-neutral-200"
                    >
                        reset height
                    </button>
                )}

                {/* The frame's own viewport once it exists, not the size we asked the element to be: that
                    inner number is what its media queries answer to, and it is the one worth trusting. */}
                <span
                    className="ml-auto whitespace-nowrap font-mono text-xs text-neutral-400"
                    title={
                        gutter.x || gutter.y
                            ? `frame element ${Math.round(frameWidth + gutter.x)}×${Math.round(frameHeight + gutter.y)} px, including ${gutter.x}px of scrollbar`
                            : undefined
                    }
                >
                    {innerSize ? innerSize.width : Math.round(frameWidth) || '—'} ×{' '}
                    {innerSize ? innerSize.height : Math.round(frameHeight) || '—'} px
                </span>
                <span
                    className="max-w-[30%] truncate whitespace-nowrap font-mono text-xs text-neutral-600"
                    title={framedPath}
                >
                    {framedPath}
                </span>
            </div>
        </div>
    );
}

/**
 * The grab strip beside the frame — the prism's 16px band with a bar that fades in on hover, mirrored
 * onto the horizontal edges. Sits outside the frame, so starting a drag never requires the pointer to
 * land on the iframe.
 */
function ResizeHandle({
    side,
    dragging,
    onPointerDown,
}: {
    dragging: 'x' | 'y' | undefined;
    onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
    side: Side;
}) {
    const vertical = side === 'top' || side === 'bottom';
    return (
        <button
            type="button"
            aria-label={`Drag to resize (${side} edge)`}
            onPointerDown={onPointerDown}
            className={cn(
                'group absolute flex touch-none select-none items-center justify-center border-0 bg-transparent p-0',
                // Straddles the border rather than sitting inside it, so the band is grabbable from both
                // sides of the edge. The offsets are half the 16px band.
                vertical ? 'inset-x-6 h-4 cursor-ns-resize' : 'inset-y-6 w-4 cursor-ew-resize',
                side === 'left' && '-left-2',
                side === 'right' && '-right-2',
                side === 'top' && '-top-2',
                side === 'bottom' && '-bottom-2',
            )}
        >
            {/* Visible at rest, not hover-only: there is nothing else on screen to hint that the frame
                edges are draggable, and a control nobody can find is a control nobody uses. */}
            <span
                className={cn(
                    'rounded transition-colors',
                    vertical ? 'h-1 w-12' : 'h-12 w-1',
                    // Only the axis being dragged goes accent, so the frame does not look grabbed on all
                    // four edges at once.
                    dragging === (vertical ? 'y' : 'x') ? 'bg-accent-600' : 'bg-white/30 group-hover:bg-accent-600',
                )}
            />
        </button>
    );
}
