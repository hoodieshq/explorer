import { describe, expect, it } from 'vitest';

import { type EpochSchedule, getEpochForSlot, getFirstSlotInEpoch, getLastSlotInEpoch } from '../epoch-schedule.js';

describe('getEpochForSlot', () => {
    it('should return the correct epoch for a slot after `firstNormalSlot`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 0n,
            firstNormalSlot: 0n,
            slotsPerEpoch: 432_000n,
        };

        expect(getEpochForSlot(schedule, 1n)).toEqual(0n);
        expect(getEpochForSlot(schedule, 431_999n)).toEqual(0n);
        expect(getEpochForSlot(schedule, 432_000n)).toEqual(1n);
        expect(getEpochForSlot(schedule, 500_000n)).toEqual(1n);
        expect(getEpochForSlot(schedule, 228_605_332n)).toEqual(529n);
    });

    it('should return the correct epoch for a slot before `firstNormalSlot`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 100n,
            firstNormalSlot: 3_200n,
            slotsPerEpoch: 432_000n,
        };

        expect(getEpochForSlot(schedule, 1n)).toEqual(0n);
        expect(getEpochForSlot(schedule, 31n)).toEqual(0n);
        expect(getEpochForSlot(schedule, 32n)).toEqual(1n);
    });

    it('should double the warmup epoch length from 32 slots up to the first normal slot', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 14n,
            firstNormalSlot: 524_256n,
            slotsPerEpoch: 432_000n,
        };

        expect(getEpochForSlot(schedule, 0n)).toEqual(0n);
        expect(getEpochForSlot(schedule, 31n)).toEqual(0n);
        expect(getEpochForSlot(schedule, 32n)).toEqual(1n);
        expect(getEpochForSlot(schedule, 95n)).toEqual(1n);
        expect(getEpochForSlot(schedule, 96n)).toEqual(2n);
        expect(getEpochForSlot(schedule, 524_255n)).toEqual(13n);
        expect(getEpochForSlot(schedule, 524_256n)).toEqual(14n);
    });
});

describe('getFirstSlotInEpoch', () => {
    it('should return the first slot for an epoch after `firstNormalEpoch`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 0n,
            firstNormalSlot: 0n,
            slotsPerEpoch: 100n,
        };

        expect(getFirstSlotInEpoch(schedule, 1n)).toEqual(100n);
        expect(getFirstSlotInEpoch(schedule, 2n)).toEqual(200n);
        expect(getFirstSlotInEpoch(schedule, 10n)).toEqual(1000n);
    });

    it('should return the first slot for an epoch before `firstNormalEpoch`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 100n,
            firstNormalSlot: 100_000n,
            slotsPerEpoch: 100n,
        };

        expect(getFirstSlotInEpoch(schedule, 0n)).toEqual(0n);
        expect(getFirstSlotInEpoch(schedule, 1n)).toEqual(32n);
        expect(getFirstSlotInEpoch(schedule, 2n)).toEqual(96n);
        expect(getFirstSlotInEpoch(schedule, 10n)).toEqual(32_736n);
    });
});

describe('getLastSlotInEpoch', () => {
    it('should return the last slot for an epoch after `firstNormalEpoch`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 0n,
            firstNormalSlot: 0n,
            slotsPerEpoch: 100n,
        };

        expect(getLastSlotInEpoch(schedule, 1n)).toEqual(199n);
        expect(getLastSlotInEpoch(schedule, 2n)).toEqual(299n);
        expect(getLastSlotInEpoch(schedule, 10n)).toEqual(1099n);
    });

    it('should return the last slot for an epoch before `firstNormalEpoch`', () => {
        const schedule: EpochSchedule = {
            firstNormalEpoch: 100n,
            firstNormalSlot: 100_000n,
            slotsPerEpoch: 100n,
        };

        expect(getLastSlotInEpoch(schedule, 0n)).toEqual(31n);
        expect(getLastSlotInEpoch(schedule, 1n)).toEqual(95n);
        expect(getLastSlotInEpoch(schedule, 2n)).toEqual(223n);
        expect(getLastSlotInEpoch(schedule, 10n)).toEqual(65_503n);
    });
});
