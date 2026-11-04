import { describe, expect, it } from 'vitest';

import { buildSlotWindow, MAX_TILES, SNAP_THRESHOLD, stepHead } from '../slot-strip';

describe('stepHead', () => {
    it('should never move backwards or past the target', () => {
        expect(stepHead(100n, 100n)).toBe(100n);
        expect(stepHead(105n, 100n)).toBe(105n);
    });

    it('should advance a single slot at a time toward the target', () => {
        expect(stepHead(100n, 101n)).toBe(101n);
        expect(stepHead(100n, 140n)).toBe(101n);
    });

    it('should snap to the target on a large desync', () => {
        const target = 100n + SNAP_THRESHOLD + 1n;
        expect(stepHead(100n, target)).toBe(target);
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
