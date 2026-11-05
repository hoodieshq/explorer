import { describe, expect, it } from 'vitest';

import { stripSimdPrefix } from '../strip-simd-prefix';

describe('stripSimdPrefix', () => {
    it('should drop a single SIMD lead', () => {
        expect(stripSimdPrefix('SIMD-0266: Efficient Token program')).toBe('Efficient Token program');
    });

    it('should drop a lead that joins several SIMDs or numbers a stage', () => {
        expect(stripSimdPrefix('SIMD-0178/0189/0377: Enables SBPFv3')).toBe('Enables SBPFv3');
        expect(stripSimdPrefix('SIMD-0437-1: Set lamports per byte to 6333')).toBe('Set lamports per byte to 6333');
    });

    it('should keep a lead that says more than the number', () => {
        expect(stripSimdPrefix('SIMD-0186 Amendment: Define fee-only semantics')).toBe(
            'SIMD-0186 Amendment: Define fee-only semantics',
        );
    });

    it('should keep a title without a SIMD lead', () => {
        expect(stripSimdPrefix('MoveStake and MoveLamports')).toBe('MoveStake and MoveLamports');
    });
});
