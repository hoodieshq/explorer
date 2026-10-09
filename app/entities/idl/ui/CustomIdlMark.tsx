'use client';

import { useAtomValue } from 'jotai';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { cn } from '@/app/components/shared/utils';

import { customIdlHighlightVariantAtom } from '../model/custom-idl/highlight-variant';
import { customIdlHighlight } from './custom-idl-highlight';

/**
 * Marks a value rendered from a user-supplied IDL. REVIEW(HOO-1971): in the `row` variant it tints the nearest
 * table row or card header instead, and falls back to the marker where the value sits in no row.
 */
export function CustomIdlMark({
    active = true,
    className,
    children,
}: {
    active?: boolean;
    className?: string;
    children: ReactNode;
}) {
    const variant = useAtomValue(customIdlHighlightVariantAtom);
    const ref = useRef<HTMLSpanElement>(null);
    const [hasRow, setHasRow] = useState(true);
    const tintsRow = active && variant === 'row';

    useEffect(() => {
        if (!tintsRow) return;
        const row = ref.current?.parentElement?.closest<HTMLElement>(ROW_SELECTOR);
        setHasRow(Boolean(row));
        return row ? holdRowTint(row) : undefined;
    }, [tintsRow]);

    return (
        <span ref={ref} className={cn(customIdlHighlight({ active: active && (!tintsRow || !hasRow) }), className)}>
            {children}
        </span>
    );
}

// A card header that holds marked values carries `data-value-row`, so a title tints its header rather than the
// outer card's row the whole card is nested in.
const ROW_SELECTOR = 'tr, [data-value-row]';

// A warm near-black, darker than the card's ground (`dk-gray-800-dark`, OKLCH lightness 0.254) and turned toward the
// `custom-idl` hue (92°): a tinted row sinks below the rows around it instead of lighting up, and the yellow edge
// carries the signal.
export const CUSTOM_IDL_ROW_TINT = 'oklch(0.215 0.018 92)';

// REVIEW(HOO-1971): the left edge of a tinted band, four 2px stripes mixed from the `custom-idl` yellow into the tint.
// The first is pure yellow, the second keeps `EDGE_SECOND_KEPT` of it, and the rest step down in equal parts to the
// tint, which is the step after the last stripe. One sharp drop, then an even fade.
const EDGE_STRIPES = 4;
const EDGE_SECOND_KEPT = 0.08;
const EDGE_YELLOW_SHARES = Array.from({ length: EDGE_STRIPES }, (_, step) =>
    step === 0 ? 1 : EDGE_SECOND_KEPT * (1 - (step - 1) / (EDGE_STRIPES - 1)),
);
export const CUSTOM_IDL_ROW_EDGE = `linear-gradient(to right, ${EDGE_YELLOW_SHARES.map(
    (share, step) =>
        `color-mix(in oklab, #facc15 ${share * 100}%, ${CUSTOM_IDL_ROW_TINT}) ${step * 2}px ${(step + 1) * 2}px`,
).join(', ')}, transparent ${EDGE_STRIPES * 2}px)`;

// Several marked values share one row, and several rows one card: each style stays until its last holder unmounts.
const tintHolders = new WeakMap<HTMLElement, number>();
const edgeHolders = new WeakMap<HTMLElement, number>();
const clipHolders = new WeakMap<HTMLElement, number>();

function holdRowTint(row: HTMLElement): () => void {
    const releaseClip = holdRoundedAncestorClip(row);
    const releaseTint = holdStyle(tintHolders, row, 'background-color', CUSTOM_IDL_ROW_TINT);
    // A table row's edge goes on its first cell: Safari paints a row's background image again in every cell.
    const edgeHost = row instanceof HTMLTableRowElement ? row.cells[0] : row;
    const releaseEdge = edgeHost && holdStyle(edgeHolders, edgeHost, 'background-image', CUSTOM_IDL_ROW_EDGE);
    return () => {
        releaseEdge?.();
        releaseTint();
        releaseClip();
    };
}

/**
 * A square tint painted at a rounded card's edge would show past its corners; this clips the nearest rounded
 * ancestor of `element` until the returned release runs. `clip`, unlike `hidden`, makes no scroll container.
 */
export function holdRoundedAncestorClip(element: HTMLElement): () => void {
    const roundedAncestor = findRoundedAncestor(element);
    return roundedAncestor ? holdStyle(clipHolders, roundedAncestor, 'overflow', 'clip') : () => {};
}

function holdStyle(holders: WeakMap<HTMLElement, number>, element: HTMLElement, property: string, value: string) {
    const count = holders.get(element) ?? 0;
    if (count === 0) element.style.setProperty(property, value);
    holders.set(element, count + 1);
    return () => {
        const remaining = (holders.get(element) ?? 1) - 1;
        holders.set(element, remaining);
        if (remaining === 0) element.style.removeProperty(property);
    };
}

function findRoundedAncestor(element: HTMLElement): HTMLElement | undefined {
    for (let current = element.parentElement; current; current = current.parentElement) {
        const { borderTopLeftRadius, borderBottomLeftRadius } = getComputedStyle(current);
        if (parseFloat(borderTopLeftRadius) > 0 || parseFloat(borderBottomLeftRadius) > 0) return current;
    }
    return undefined;
}
