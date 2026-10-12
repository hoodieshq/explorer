export type Point = { left: number; top: number };
export type Size = { width: number; height: number };

/** How far the button keeps from the window's edge once the window is too small for the spot the user chose. */
export const SQUEEZED_EDGE_GAP = 20;

/**
 * Where the button shows: the spot the user dragged it to, unless the window no longer holds it. On an axis where it
 * sticks out, it moves to `SQUEEZED_EDGE_GAP` from that edge; once the window grows back, the chosen spot fits again
 * and the button returns to it.
 */
export function placeInViewport(chosen: Point, button: Size, viewport: Size): Point {
    return {
        left: placeOnAxis(chosen.left, button.width, viewport.width),
        top: placeOnAxis(chosen.top, button.height, viewport.height),
    };
}

/** Keeps a dragged button fully inside the window; it may go right up to the edge. */
export function keepInViewport(point: Point, button: Size, viewport: Size): Point {
    return {
        left: clamp(point.left, 0, viewport.width - button.width),
        top: clamp(point.top, 0, viewport.height - button.height),
    };
}

function placeOnAxis(start: number, size: number, available: number): number {
    if (start + size > available) return Math.max(SQUEEZED_EDGE_GAP, available - size - SQUEEZED_EDGE_GAP);
    if (start < 0) return SQUEEZED_EDGE_GAP;
    return start;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), Math.max(min, max));
}
