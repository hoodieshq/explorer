'use client';

import { cn } from '@components/shared/utils';
import { useAtom } from 'jotai';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Star } from 'react-feather';

import { NAV_PREVIEW_PATH } from '@/app/nav-preview/path';

import { ICON_SET_IDS, ICON_SET_LABELS, iconSetAtom } from './icon-sets';
import { NAV_VARIANTS_ENABLED } from './nav-variant-storage';
import { NAV_VARIANTS, navVariantAtom } from './registry';
import { SAVE_FLOW_VARIANTS, saveFlowVariantAtom } from './save-flow-variants';
import { PLAQUE_MARGIN, useDraggablePlaque } from './use-draggable-plaque';

const STORAGE_KEY = 'explorer:navVariantSwitcherPosition';
const WIDTH_KEY = 'explorer:navVariantSwitcherWidth';
const SHORTLIST_KEY = 'explorer:navVariantShortlist';
const COLLAPSED_KEY = 'explorer:navVariantSwitcherCollapsed';
const DEFAULT_WIDTH = 200;
const MIN_WIDTH = 160;
const MAX_WIDTH = 520;

/** On by default: the shortlist is what the review is actually choosing between. */
function readShortlist() {
    try {
        return localStorage.getItem(SHORTLIST_KEY) !== 'false';
    } catch {
        return true;
    }
}

/** Open by default: a plate that started folded would leave a reviewer hunting for the thing they came
 *  for. Folded is a choice, so it is the one that is remembered. */
function readCollapsed() {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === 'true';
    } catch {
        return false;
    }
}

function readWidth() {
    try {
        const stored = Number(localStorage.getItem(WIDTH_KEY));
        if (!Number.isFinite(stored) || stored <= 0) return DEFAULT_WIDTH;
        return Math.min(Math.max(stored, MIN_WIDTH), MAX_WIDTH);
    } catch {
        return DEFAULT_WIDTH;
    }
}

/**
 * Design-review control for comparing navigation variants, mounted in the root layout so it is reachable
 * from any page. Deliberately outside the navbar: the navbar is the thing under review, and a switcher
 * inside it would change the layout being judged.
 *
 * Visually this is the same plate as the MCP docs `VersionSwitcher` — grip handle, segmented control,
 * translucent surface — so the two review controls read as one tool. Two things differ, both forced by
 * this one being global rather than scoped to a page:
 *
 * - `fixed` and `z-[2000]`, not `absolute z-50`. The cluster panel is pinned to the right edge at
 *   `z-[1060]` behind an overlay at `z-[1050]`, and the app's own ceiling is `z-[1203]`; anything lower
 *   would be covered whenever that panel is open — and the panel is part of the navbar being reviewed.
 * - The position is stored, not re-parked per load. This plate outlives a page navigation, so a plate
 *   dragged clear of something would otherwise jump back on the next click-through.
 *
 * Bottom-left by default, which clears the cluster panel, the navbar itself and the bottom-centred
 * toaster.
 */
export function NavVariantSwitcher() {
    const [variant, setVariant] = useAtom(navVariantAtom);
    const [iconSet, setIconSet] = useAtom(iconSetAtom);
    const [saveFlow, setSaveFlow] = useAtom(saveFlowVariantAtom);
    const { dragging, onHandlePointerDown, position, ready, ref, reset } = useDraggablePlaque(STORAGE_KEY);
    // Suppressed inside the preview harness's frame: a fixed plate there covers the very layout being
    // reviewed, and the harness keeps its own copy outside the frame. Checked after mount because the
    // server cannot know whether it is rendering into a frame.
    const [framed, setFramed] = useState(false);
    useEffect(() => setFramed(window.self !== window.top), []);

    /**
     * The plate is resizable sideways, because a variant's name is the thing worth reading and some of
     * them are long. The whole right edge is the grip rather than the browser's corner widget: an edge is
     * where a hand goes for a width, a corner offers a height this plate has no use for, and the widget
     * itself would sit inside a rounded panel looking like something that fell in.
     */
    const [width, setWidth] = useState(DEFAULT_WIDTH);
    useEffect(() => setWidth(readWidth()), []);

    // Read after mount, like everything else here, so the server-rendered markup is not contradicted.
    const [shortlist, setShortlist] = useState(true);
    useEffect(() => setShortlist(readShortlist()), []);

    /**
     * Folded, the plate is its header and nothing else. On a phone the three lists run to half the screen
     * and stand over the very bar being reviewed — and most of the time the reviewer is looking, not
     * switching. Remembered like the position and the width, so the choice survives a page navigation.
     */
    const [collapsed, setCollapsed] = useState(false);
    useEffect(() => setCollapsed(readCollapsed()), []);
    const toggleCollapsed = useCallback(() => {
        setCollapsed(current => {
            const next = !current;
            try {
                localStorage.setItem(COLLAPSED_KEY, String(next));
            } catch {
                /* storage unavailable — the choice still holds for this page view */
            }
            return next;
        });
    }, []);
    const toggleShortlist = useCallback(() => {
        setShortlist(current => {
            const next = !current;
            try {
                localStorage.setItem(SHORTLIST_KEY, String(next));
            } catch {
                /* storage unavailable — the choice still holds for this page view */
            }
            return next;
        });
    }, []);

    const onResizePointerDown = useCallback((event: React.PointerEvent<HTMLElement>) => {
        // Secondary buttons open context menus and would start a drag that never gets its pointerup.
        if (event.button !== 0) return;
        event.preventDefault();
        const handle = event.currentTarget;
        const startX = event.clientX;
        const startWidth = handle.parentElement?.getBoundingClientRect().width ?? DEFAULT_WIDTH;
        let latest = startWidth;

        // Capture on the handle: the pointer regularly leaves a 6px strip mid-drag, and this keeps the
        // move stream coming without depending on where it went.
        try {
            handle.setPointerCapture(event.pointerId);
        } catch {
            /* capture unsupported — the drag still works while the cursor stays on the handle */
        }

        const onMove = (moveEvent: PointerEvent) => {
            latest = Math.min(Math.max(Math.round(startWidth + moveEvent.clientX - startX), MIN_WIDTH), MAX_WIDTH);
            setWidth(latest);
        };
        const onUp = () => {
            handle.removeEventListener('pointermove', onMove);
            handle.removeEventListener('pointerup', onUp);
            handle.removeEventListener('pointercancel', onUp);
            try {
                localStorage.setItem(WIDTH_KEY, String(latest));
            } catch {
                /* storage unavailable — the width still holds for this page view */
            }
        };
        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onUp);
        handle.addEventListener('pointercancel', onUp);
    }, []);
    const pathname = usePathname();

    /**
     * The preview route pins a control strip along the bottom edge, and this plate is above it at
     * `z-[2000]` — parked in the same corner it swallowed the clicks meant for the leftmost width chips.
     * Cleared by the strip's height there. A dragged position still wins; this is only where it starts.
     */
    const onPreviewRoute = pathname === NAV_PREVIEW_PATH;
    const defaultCorner = {
        bottom: onPreviewRoute ? PLAQUE_MARGIN + 48 : PLAQUE_MARGIN,
        left: PLAQUE_MARGIN,
    };

    // The one in use is always listed, shortlisted or not: a picker that hides what is currently on
    // screen leaves no way to tell what you are looking at.
    const shown = shortlist ? NAV_VARIANTS.filter(entry => entry.shortlist || entry.id === variant) : NAV_VARIANTS;

    if (!NAV_VARIANTS_ENABLED || framed) return undefined;

    return (
        <div
            ref={ref}
            className={cn(
                // A column, not a row: with seven variants a segmented strip ran past the width of the
                // page, and the names it now carries would have made that worse. The header keeps the row
                // it had, so the grip is still where the hand expects it.
                'fixed z-[2000] flex flex-col gap-1.5 rounded-xl border border-solid border-white/10',
                'bg-[#121716]/90 p-1.5 shadow-[0px_10px_30px_-10px_#000000cc] backdrop-blur',
                // Hidden for the one frame before the stored position is read, so it never visibly jumps
                // from the default corner to where it was left.
                !ready && 'invisible',
            )}
            style={{
                ...(position ? { left: position.x, top: position.y } : defaultCorner),
                maxWidth: MAX_WIDTH,
                minWidth: MIN_WIDTH,
                width,
            }}
        >
            {/* The width grip: the right edge, no widget. It shows itself only under the cursor, and it
                sits in the plate's own padding, so it never covers a row. */}
            <span
                aria-hidden
                onPointerDown={onResizePointerDown}
                className="absolute inset-y-1 right-0 w-1.5 cursor-ew-resize touch-none select-none rounded-full bg-transparent transition-colors hover:bg-white/20"
            />

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    aria-label="Drag to move"
                    title="Drag to move · double-click to reset"
                    onPointerDown={onHandlePointerDown}
                    onDoubleClick={reset}
                    className={cn(
                        'flex shrink-0 touch-none select-none items-center border-0 bg-transparent px-1 py-1 text-neutral-500 hover:text-neutral-300',
                        dragging ? 'cursor-grabbing' : 'cursor-grab',
                    )}
                >
                    <GripDots />
                </button>

                <button
                    type="button"
                    aria-expanded={!collapsed}
                    aria-label={collapsed ? 'Show the variant lists' : 'Fold the variant lists away'}
                    title={collapsed ? 'Show the variants' : 'Fold away'}
                    onClick={toggleCollapsed}
                    className="flex cursor-pointer items-center gap-1 whitespace-nowrap border-0 bg-transparent p-0 text-xs uppercase tracking-wide text-neutral-500 transition-colors hover:text-neutral-300"
                >
                    <ChevronDown
                        size={13}
                        aria-hidden
                        className={cn('shrink-0 transition-transform', collapsed && '-rotate-90')}
                    />
                    Navigation
                </button>

                {/* Filled while the list is the shortlist, hollow while it is everything. */}
                <button
                    type="button"
                    aria-pressed={shortlist}
                    aria-label={shortlist ? 'Show every variant' : 'Show the shortlist'}
                    title={shortlist ? 'Showing the shortlist' : 'Showing every variant'}
                    onClick={toggleShortlist}
                    className={cn(
                        'ml-auto flex shrink-0 cursor-pointer items-center border-0 bg-transparent px-1 py-0 transition-colors',
                        shortlist ? 'text-[#1dd79b]' : 'text-neutral-500 hover:text-neutral-300',
                        // Nothing to filter while the lists are folded away.
                        collapsed && 'hidden',
                    )}
                >
                    <Star size={15} aria-hidden fill={shortlist ? 'currentColor' : 'none'} />
                </button>
            </div>

            {/* Folded, everything below the header goes — the plate keeps only its grip, its name and the
                two toggles, which is what it is for while a reviewer is looking rather than switching. */}
            <div
                className={cn(
                    'flex-col overflow-hidden rounded-lg border border-solid border-white/10',
                    collapsed ? 'hidden' : 'flex',
                )}
            >
                {shown.map(({ id, name }) => (
                    <button
                        key={id}
                        type="button"
                        aria-pressed={id === variant}
                        // `onPointerDown` as well as `onClick`: these rows carry hover styles, and a
                        // touch browser spends the first tap on showing that hover — the choice only
                        // landed on the second. Acting on the press makes one tap enough, and the click
                        // that follows sets the same id again, which changes nothing. `onClick` stays for
                        // the keyboard, which never presses a pointer.
                        onPointerDown={() => setVariant(id)}
                        onClick={() => setVariant(id)}
                        className={cn(
                            'flex cursor-pointer items-baseline gap-2 border-0 px-2 py-1.5 text-left text-xs transition-colors',
                            id === variant
                                ? 'bg-heavy-metal-800 text-white'
                                : 'bg-transparent text-neutral-500 hover:text-neutral-200',
                        )}
                    >
                        {/* Fixed width, so the names line up into a column of their own; wide enough for
                            a decimal id, which is what a variation on another variant gets. */}
                        <span className="w-10 shrink-0 font-medium uppercase tabular-nums">{id}</span>
                        {/* Titled as well as truncated: a narrow plate can still be asked what a name says. */}
                        <span className="truncate" title={name}>
                            {name}
                        </span>
                    </button>
                ))}
            </div>

            {/* How the dropdown offers to keep the endpoint in its field under a name. Its own list rather
                than a cross of bar × flow: every bar past the first two opens the same dropdown, so this
                is one choice inside all of them. Labelled, unlike the two lists above — by the third
                group an unlabelled column of names stops saying what it is a list of. */}
            <span
                className={cn(
                    'px-2 pt-0.5 text-[10px] uppercase tracking-wide text-neutral-500',
                    collapsed && 'hidden',
                )}
            >
                RPC save flow
            </span>
            <div
                className={cn(
                    'flex-col overflow-hidden rounded-lg border border-solid border-white/10',
                    collapsed ? 'hidden' : 'flex',
                )}
            >
                {SAVE_FLOW_VARIANTS.map(({ id, name }, index) => (
                    <button
                        key={id}
                        type="button"
                        aria-pressed={id === saveFlow}
                        onPointerDown={() => setSaveFlow(id)}
                        onClick={() => setSaveFlow(id)}
                        className={cn(
                            'flex cursor-pointer items-baseline gap-2 border-0 px-2 py-1.5 text-left text-xs transition-colors',
                            id === saveFlow
                                ? 'bg-heavy-metal-800 text-white'
                                : 'bg-transparent text-neutral-500 hover:text-neutral-200',
                        )}
                    >
                        {/* Lettered, because the ids are words and the words are already the second
                            column: `s1 field / s2 prompt / s3 morph` would print the same thing twice. */}
                        <span className="w-10 shrink-0 font-medium uppercase tabular-nums">
                            {String.fromCharCode(97 + index)}
                        </span>
                        <span className="truncate" title={name}>
                            {name}
                        </span>
                    </button>
                ))}
            </div>

            {/* The connection glyph, which is a design decision of its own and reads differently at 10px
                than it does in a sketch. Named rather than numbered: three digits in a row say nothing.
                Shown only while the full list is: with the shortlist up, the review is choosing between
                bars, and a second list of things to try is in the way of that. */}
            <div
                className={cn(
                    'flex-col overflow-hidden rounded-lg border border-solid border-white/10',
                    shortlist || collapsed ? 'hidden' : 'flex',
                )}
            >
                {ICON_SET_IDS.map(id => (
                    <button
                        key={id}
                        type="button"
                        aria-pressed={id === iconSet}
                        onPointerDown={() => setIconSet(id)}
                        onClick={() => setIconSet(id)}
                        className={cn(
                            'flex cursor-pointer items-baseline gap-2 border-0 px-2 py-1.5 text-left text-xs transition-colors',
                            id === iconSet
                                ? 'bg-heavy-metal-800 text-white'
                                : 'bg-transparent text-neutral-500 hover:text-neutral-200',
                        )}
                    >
                        <span className="w-10 shrink-0 font-medium uppercase tabular-nums">
                            {id.replace('set', 'i')}
                        </span>
                        <span className="truncate" title={ICON_SET_LABELS[id]}>
                            {ICON_SET_LABELS[id]}
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

/** Six-dot grip, the conventional "grab me" affordance. Matches the MCP docs plate. */
function GripDots() {
    return (
        <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor" aria-hidden focusable="false">
            {[3, 8, 13].map(cy => [2, 8].map(cx => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.2" />))}
        </svg>
    );
}
