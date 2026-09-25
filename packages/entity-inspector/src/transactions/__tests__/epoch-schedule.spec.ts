import { getEpochForSlot } from '@explorer/utils';
import { describe, expect, it } from 'vitest';

import type { SupportedCluster } from '../../config.js';
import { EPOCH_SCHEDULES } from '../epoch-schedule.js';

const SLOTS_PER_EPOCH = 432_000;
const TESTNET_FIRST_NORMAL_SLOT = 524_256;

function epochAt(cluster: SupportedCluster, slot: number): bigint {
    return getEpochForSlot(EPOCH_SCHEDULES[cluster], BigInt(slot));
}

describe('EPOCH_SCHEDULES', () => {
    it('should split mainnet-beta slots into fixed-length epochs from genesis', () => {
        expect(epochAt('mainnet-beta', 0)).toBe(0n);
        expect(epochAt('mainnet-beta', SLOTS_PER_EPOCH - 1)).toBe(0n);
        expect(epochAt('mainnet-beta', SLOTS_PER_EPOCH)).toBe(1n);
        expect(epochAt('mainnet-beta', 759 * SLOTS_PER_EPOCH)).toBe(759n);
    });

    it('should split devnet slots into fixed-length epochs from genesis', () => {
        expect(epochAt('devnet', 842 * SLOTS_PER_EPOCH - 1)).toBe(841n);
        expect(epochAt('devnet', 842 * SLOTS_PER_EPOCH)).toBe(842n);
    });

    it('should start testnet fixed-length epochs at its first normal slot', () => {
        expect(epochAt('testnet', TESTNET_FIRST_NORMAL_SLOT)).toBe(14n);
        expect(epochAt('testnet', TESTNET_FIRST_NORMAL_SLOT + SLOTS_PER_EPOCH - 1)).toBe(14n);
        expect(epochAt('testnet', TESTNET_FIRST_NORMAL_SLOT + SLOTS_PER_EPOCH)).toBe(15n);
    });

    it('should end the testnet warmup epochs one slot before its first normal slot', () => {
        expect(epochAt('testnet', 0)).toBe(0n);
        expect(epochAt('testnet', TESTNET_FIRST_NORMAL_SLOT - 1)).toBe(13n);
    });
});
