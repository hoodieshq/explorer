// Pure helpers for the live slot strip. Kept out of the component so the interpolation rules can be
// unit-tested without a React/provider harness.

export const MAX_TILES = 8;
/** How far the client-side interpolation may run past the last polled slot before holding for a resync. */
export const MAX_DRIFT = 6n;
export const DEFAULT_CADENCE_MS = 400;
const MIN_CADENCE_MS = 200;
const MAX_CADENCE_MS = 1200;

/** Clamp a measured slot time into a sane animation cadence, falling back when it is missing. */
export function clampCadence(msPerSlot: number): number {
    if (!msPerSlot || Number.isNaN(msPerSlot)) return DEFAULT_CADENCE_MS;
    return Math.min(MAX_CADENCE_MS, Math.max(MIN_CADENCE_MS, Math.round(msPerSlot)));
}

/** Resync to a freshly polled slot without ever moving the head backwards. */
export function resyncHead(prev: bigint, realSlot: bigint): bigint {
    return realSlot > prev ? realSlot : prev;
}

/** One interpolation tick: advance by a slot unless we are already MAX_DRIFT ahead of the last poll. */
export function advanceHead(prev: bigint, realSlot: bigint, maxDrift: bigint = MAX_DRIFT): bigint {
    return prev - realSlot < maxDrift ? prev + 1n : prev;
}

/** The window of slots to show, oldest first, clamped to non-negative values. */
export function buildSlotWindow(head: bigint, maxTiles: number = MAX_TILES): bigint[] {
    return Array.from({ length: maxTiles }, (_, i) => head - BigInt(maxTiles - 1 - i)).filter(slot => slot >= 0n);
}
