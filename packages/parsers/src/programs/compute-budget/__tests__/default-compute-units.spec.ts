import { describe, expect, it } from 'vitest';

import { gen } from '../../../__tests__/gen.js';
import { getDefaultComputeUnits } from '../default-compute-units.js';

describe('getDefaultComputeUnits', () => {
    it('should report the quoted cost of a builtin', () => {
        expect(getDefaultComputeUnits(gen.systemProgram)).toBe(150);
        expect(getDefaultComputeUnits(gen.voteProgram)).toBe(2_100);
    });

    it('should report zero for a program with no quoted cost', () => {
        expect(getDefaultComputeUnits(gen.address(1))).toBe(0);
    });
});
