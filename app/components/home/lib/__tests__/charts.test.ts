import { describe, expect, it } from 'vitest';

import { ringDashOffset, sparklinePaths } from '../charts';

describe('sparklinePaths', () => {
    it('should return undefined with fewer than two points', () => {
        expect(sparklinePaths([1000], 100, 32)).toBeUndefined();
        expect(sparklinePaths([], 100, 32)).toBeUndefined();
    });

    it('should start the line at the first sample and close the area to the baseline', () => {
        const paths = sparklinePaths([1000, 2000, 1500, 3000], 100, 32);
        expect(paths?.line.startsWith('M')).toBe(true);
        expect(paths?.area.endsWith('L100 32 L0 32 Z')).toBe(true);
    });

    it('should treat null samples as zero', () => {
        const withNulls = sparklinePaths([null, 2000, null, 3000], 100, 32);
        const withZeros = sparklinePaths([0, 2000, 0, 3000], 100, 32);
        expect(withNulls).toEqual(withZeros);
    });

    it('should place the peak sample near the top of the viewbox', () => {
        const paths = sparklinePaths([0, 100], 100, 32);
        // Second coord is the max: y = height - (height - 2) - 1 = 1.
        expect(paths?.line).toContain('L100.00 1.00');
    });
});

describe('ringDashOffset', () => {
    const C = 100;

    it('should be the full circumference at zero progress and zero when complete', () => {
        expect(ringDashOffset(0, C)).toBe(100);
        expect(ringDashOffset(1, C)).toBe(0);
    });

    it('should shrink as progress grows', () => {
        expect(ringDashOffset(0.25, C)).toBeGreaterThan(ringDashOffset(0.75, C));
    });

    it('should clamp out-of-range progress', () => {
        expect(ringDashOffset(-1, C)).toBe(100);
        expect(ringDashOffset(2, C)).toBe(0);
    });
});
