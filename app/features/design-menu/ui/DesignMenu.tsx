'use client';

import { Popover, PopoverContent, PopoverTrigger } from '@components/shared/ui/popover';
import { useAtom } from 'jotai';
import { type PointerEvent, useEffect, useRef, useState } from 'react';

import { keepInViewport, placeInViewport, type Point, type Size, SQUEEZED_EDGE_GAP } from '../lib/place-in-viewport';
import { designMenuPositionAtom } from '../model/position';
import { DesignMenuSections } from './DesignMenuSections';

// REVIEW(design-menu): the review-only design menu (template: ALX_LOCAL/recipes/design-menu); remove before the
// external PR.

/**
 * A small floating button that opens the design menu on a press and moves when dragged. It remembers where the
 * user dropped it and stays inside the window when the window shrinks.
 */
export function DesignMenu() {
    const viewport = useViewportSize();
    const [chosen, setChosen] = useAtom(designMenuPositionAtom);
    const [dragPoint, setDragPoint] = useState<Point>();
    const [open, setOpen] = useState(false);
    const drag = useRef<{ pointerX: number; pointerY: number; start: Point; moved: boolean } | undefined>(undefined);
    // The click that ends a drag must not open the menu.
    const suppressClick = useRef(false);

    if (!viewport) return undefined;
    const home = chosen ?? { left: SQUEEZED_EDGE_GAP, top: viewport.height - BUTTON.height - SQUEEZED_EDGE_GAP };
    const shown = dragPoint ?? placeInViewport(home, BUTTON, viewport);

    const onPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { moved: false, pointerX: event.clientX, pointerY: event.clientY, start: shown };
    };
    const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
        const current = drag.current;
        if (!current) return;
        const dx = event.clientX - current.pointerX;
        const dy = event.clientY - current.pointerY;
        if (!current.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        if (!current.moved) setOpen(false);
        current.moved = true;
        setDragPoint(keepInViewport({ left: current.start.left + dx, top: current.start.top + dy }, BUTTON, viewport));
    };
    const onPointerUp = () => {
        const current = drag.current;
        drag.current = undefined;
        if (!current?.moved) return;
        suppressClick.current = true;
        if (dragPoint) setChosen(dragPoint);
        setDragPoint(undefined);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label="Design menu"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                    onClick={event => {
                        if (!suppressClick.current) return;
                        suppressClick.current = false;
                        // Radix toggles the popover on click unless the handler prevents it.
                        event.preventDefault();
                    }}
                    style={{ height: BUTTON.height, left: shown.left, top: shown.top, width: BUTTON.width }}
                    className="fixed z-40 flex cursor-grab touch-none select-none items-center justify-center rounded-full border border-solid border-outer-space-800 bg-outer-space-900 p-0 text-lg shadow-[0_4px_12px_rgba(0,0,0,0.5)] active:cursor-grabbing"
                >
                    <span aria-hidden>🎨</span>
                </button>
            </PopoverTrigger>
            <PopoverContent className="flex w-72 flex-col gap-4 p-4" collisionPadding={SQUEEZED_EDGE_GAP}>
                <span className="text-xs uppercase tracking-[0.08em] text-outer-space-300">Design menu</span>
                <DesignMenuSections />
            </PopoverContent>
        </Popover>
    );
}

const BUTTON: Size = { height: 40, width: 40 };

// A press that moves less than this is a click, so a slightly shaky press still opens the menu.
const DRAG_THRESHOLD = 4;

function useViewportSize(): Size | undefined {
    const [size, setSize] = useState<Size>();
    useEffect(() => {
        const update = () => setSize({ height: window.innerHeight, width: window.innerWidth });
        update();
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, []);
    return size;
}
