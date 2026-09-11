import { useCallback, useEffect, useRef, useState } from 'react';

/** Same corner inset the MCP docs plate uses, so the two review plates park identically. */
export const PLAQUE_MARGIN = 16;

export interface PlaquePosition {
    x: number;
    y: number;
}

/**
 * Viewport coordinates, so nothing can be dragged past an edge and left unreachable — including the case
 * where a position saved on a wide monitor is reopened on a laptop, which is why `clamp` also runs on
 * resize rather than only on drop.
 */
function clamp(position: PlaquePosition, size: { height: number; width: number }): PlaquePosition {
    const margin = PLAQUE_MARGIN;
    const maxX = Math.max(margin, window.innerWidth - size.width - margin);
    const maxY = Math.max(margin, window.innerHeight - size.height - margin);
    return {
        x: Math.min(Math.max(position.x, margin), maxX),
        y: Math.min(Math.max(position.y, margin), maxY),
    };
}

/**
 * localStorage throws outright in some contexts (private windows, site data blocked, thumbnailing), and
 * the key is hand-editable, so both directions are guarded and a bad value is treated as no value.
 */
function readStored(key: string): PlaquePosition | undefined {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return undefined;
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return undefined;
        const { x, y } = parsed as Partial<Record<keyof PlaquePosition, unknown>>;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
        return { x: x as number, y: y as number };
    } catch {
        return undefined;
    }
}

function writeStored(key: string, position: PlaquePosition | undefined): void {
    try {
        if (position) localStorage.setItem(key, JSON.stringify(position));
        else localStorage.removeItem(key);
    } catch {
        /* storage unavailable — the position still works for this page view */
    }
}

/**
 * Free-dragging for a floating panel, by a handle rather than the whole surface so the controls inside it
 * stay clickable.
 *
 * `position === undefined` means "never moved": the caller leaves its own CSS corner in charge, so the
 * default placement lives in one place instead of being duplicated as coordinates here.
 */
export function useDraggablePlaque(storageKey: string) {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState<PlaquePosition | undefined>(undefined);
    const [dragging, setDragging] = useState(false);
    // Reading storage during render would disagree with the server-rendered markup; reading it in an
    // effect paints the default corner first. `ready` keeps the plaque hidden for that one frame instead
    // of letting it visibly jump.
    const [ready, setReady] = useState(false);
    const grabOffset = useRef<PlaquePosition>({ x: 0, y: 0 });

    useEffect(() => {
        const stored = readStored(storageKey);
        const element = ref.current;
        if (stored && element) {
            const { height, width } = element.getBoundingClientRect();
            setPosition(clamp(stored, { height, width }));
        }
        setReady(true);
    }, [storageKey]);

    // Only meaningful once moved: an unmoved plaque is positioned by CSS, which reflows on its own.
    useEffect(() => {
        if (!position) return;
        const onResize = () => {
            const element = ref.current;
            if (!element) return;
            const { height, width } = element.getBoundingClientRect();
            setPosition(current => (current ? clamp(current, { height, width }) : current));
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [position]);

    const onHandlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            // Secondary buttons open context menus and would start a drag that never gets its pointerup.
            if (event.button !== 0) return;
            const element = ref.current;
            if (!element) return;

            const rect = element.getBoundingClientRect();
            grabOffset.current = { x: event.clientX - rect.left, y: event.clientY - rect.top };
            setDragging(true);

            // Window-level rather than pointer capture on the handle: the pointer regularly leaves the
            // handle mid-drag, and this keeps tracking it without depending on capture semantics.
            const onMove = (moveEvent: PointerEvent) => {
                const size = element.getBoundingClientRect();
                setPosition(
                    clamp(
                        {
                            x: moveEvent.clientX - grabOffset.current.x,
                            y: moveEvent.clientY - grabOffset.current.y,
                        },
                        { height: size.height, width: size.width },
                    ),
                );
            };
            const onUp = () => {
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', onUp);
                window.removeEventListener('pointercancel', onUp);
                setDragging(false);
                // Read back off the element: the last committed position is what the user sees, and it is
                // already clamped.
                const rectOnDrop = element.getBoundingClientRect();
                writeStored(storageKey, { x: rectOnDrop.left, y: rectOnDrop.top });
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
        },
        [storageKey],
    );

    const reset = useCallback(() => {
        setPosition(undefined);
        writeStored(storageKey, undefined);
    }, [storageKey]);

    return { dragging, onHandlePointerDown, position, ready, ref, reset };
}
