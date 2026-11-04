// Pure helpers for the live slot strip. Kept out of the component so the stepping rules can be
// unit-tested without a React/provider harness.

export const MAX_TILES = 8;
/** Calm visual cadence — deliberately slower than the real ~400ms slot time so the strip reads as a
 *  gentle tick rather than a flicker. The strip trails the chain slightly as a result; the exact
 *  current slot stays authoritative in the stats grid. */
export const CALM_CADENCE_MS = 600;
/** Only a leap this large (a tab that was hidden for minutes) snaps; normal running crawls one slot
 *  at a time and never jumps. */
export const SNAP_THRESHOLD = 400n;

/** One calm tick toward the latest polled slot: never backwards, a single slot at a time, snapping
 *  only on a large desync so the numbers never jump around during normal use. */
export function stepHead(prev: bigint, target: bigint): bigint {
    if (target <= prev) return prev;
    if (target - prev > SNAP_THRESHOLD) return target;
    return prev + 1n;
}

/** The window of slots to show, oldest first, clamped to non-negative values. */
export function buildSlotWindow(head: bigint, maxTiles: number = MAX_TILES): bigint[] {
    return Array.from({ length: maxTiles }, (_, i) => head - BigInt(maxTiles - 1 - i)).filter(slot => slot >= 0n);
}
