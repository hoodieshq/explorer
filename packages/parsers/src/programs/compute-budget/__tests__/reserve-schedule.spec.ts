import { describe, expect, it } from 'vitest';

import { gen } from '../../../__tests__/gen.js';
import { getReservedComputeUnits } from '../reserve-schedule.js';

describe('getReservedComputeUnits', () => {
    it('should reserve the default for a BPF program', () => {
        expect(getReservedComputeUnits({ cluster: 'mainnet-beta', epoch: 1000n, programAddress: gen.address(1) })).toBe(
            200_000,
        );
    });

    it('should reserve the minimal amount for a builtin once the gate is active', () => {
        expect(
            getReservedComputeUnits({ cluster: 'mainnet-beta', epoch: 759n, programAddress: gen.systemProgram }),
        ).toBe(3_000);
    });

    it('should reserve the default for a builtin before the gate activates', () => {
        expect(
            getReservedComputeUnits({ cluster: 'mainnet-beta', epoch: 758n, programAddress: gen.systemProgram }),
        ).toBe(200_000);
    });

    it('should activate at its own epoch on each cluster', () => {
        expect(getReservedComputeUnits({ cluster: 'devnet', epoch: 842n, programAddress: gen.systemProgram })).toBe(
            3_000,
        );
        expect(getReservedComputeUnits({ cluster: 'devnet', epoch: 841n, programAddress: gen.systemProgram })).toBe(
            200_000,
        );
        expect(getReservedComputeUnits({ cluster: 'testnet', epoch: 750n, programAddress: gen.systemProgram })).toBe(
            3_000,
        );
    });

    it('should apply the newest configuration on a custom cluster', () => {
        expect(getReservedComputeUnits({ cluster: 'custom', programAddress: gen.systemProgram })).toBe(3_000);
    });

    it('should treat an absent epoch as epoch zero', () => {
        expect(getReservedComputeUnits({ cluster: 'mainnet-beta', programAddress: gen.systemProgram })).toBe(200_000);
    });
});
