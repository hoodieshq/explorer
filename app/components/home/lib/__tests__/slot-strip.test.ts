import { describe, expect, it } from 'vitest';

import {
    advanceHead,
    buildSlotWindow,
    clampCadence,
    DEFAULT_CADENCE_MS,
    MAX_DRIFT,
    MAX_TILES,
    resyncHead,
} from '../slot-strip';

describe('clampCadence', () => {
    it('should fall back when the slot time is missing or NaN', () => {
        expect(clampCadence(0)).toBe(DEFAULT_CADENCE_MS);
        expect(clampCadence(Number.NaN)).toBe(DEFAULT_CADENCE_MS);
    });

    it('should pass a typical slot time through, rounded', () => {
        expect(clampCadence(412.6)).toBe(413);
    });

    it('should clamp extreme values into the animation range', () => {
        expect(clampCadence(50)).toBe(200);
        expect(clampCadence(5000)).toBe(1200);
    });
});

describe('resyncHead', () => {
    it('should jump forward to a newer polled slot', () => {
        expect(resyncHead(100n, 105n)).toBe(105n);
    });

    it('should never move the head backwards', () => {
        expect(resyncHead(105n, 100n)).toBe(105n);
        expect(resyncHead(105n, 105n)).toBe(105n);
    });
});

describe('advanceHead', () => {
    it('should advance by one slot while within the drift cap', () => {
        expect(advanceHead(100n, 100n)).toBe(101n);
        expect(advanceHead(100n + (MAX_DRIFT - 1n), 100n)).toBe(100n + MAX_DRIFT);
    });

    it('should hold once it is MAX_DRIFT ahead of the last poll', () => {
        const ahead = 100n + MAX_DRIFT;
        expect(advanceHead(ahead, 100n)).toBe(ahead);
    });
});

describe('buildSlotWindow', () => {
    it('should return MAX_TILES consecutive slots, oldest first', () => {
        const window = buildSlotWindow(1000n);
        expect(window).toHaveLength(MAX_TILES);
        expect(window.at(0)).toBe(1000n - BigInt(MAX_TILES - 1));
        expect(window.at(-1)).toBe(1000n);
    });

    it('should drop negative slots near genesis', () => {
        const window = buildSlotWindow(3n);
        expect(window).toEqual([0n, 1n, 2n, 3n]);
    });
});
