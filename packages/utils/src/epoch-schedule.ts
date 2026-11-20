const MINIMUM_SLOTS_PER_EPOCH = 32n;

/** The epoch schedule fields the slot math needs. */
export type EpochSchedule = {
    /** The maximum number of slots in each epoch. */
    slotsPerEpoch: bigint;
    /** The first epoch with `slotsPerEpoch` slots. */
    firstNormalEpoch: bigint;
    /** The first slot of `firstNormalEpoch`. */
    firstNormalSlot: bigint;
};

/** Returns log2 of `n`, which equals its trailing zero count when `n` is a power of two. */
function trailingZeros(n: bigint): number {
    let zeros = 0;
    while (n > 1n) {
        n /= 2n;
        zeros++;
    }
    return zeros;
}

/** Returns the smallest power of two greater than or equal to `n`. */
function nextPowerOfTwo(n: bigint): bigint {
    if (n === 0n) return 1n;
    n--;
    n |= n >> 1n;
    n |= n >> 2n;
    n |= n >> 4n;
    n |= n >> 8n;
    n |= n >> 16n;
    n |= n >> 32n;
    return n + 1n;
}

/**
 * Warmup epochs start at `MINIMUM_SLOTS_PER_EPOCH` slots and double in length.
 * The math matches Agave's `get_epoch_and_slot_index`.
 */
export function getEpochForSlot(epochSchedule: EpochSchedule, slot: bigint): bigint {
    if (slot < epochSchedule.firstNormalSlot) {
        const epoch =
            trailingZeros(nextPowerOfTwo(slot + MINIMUM_SLOTS_PER_EPOCH + 1n)) -
            trailingZeros(MINIMUM_SLOTS_PER_EPOCH) -
            1;
        return BigInt(epoch);
    }

    const normalEpochIndex = (slot - epochSchedule.firstNormalSlot) / epochSchedule.slotsPerEpoch;
    return epochSchedule.firstNormalEpoch + normalEpochIndex;
}

export function getFirstSlotInEpoch(epochSchedule: EpochSchedule, epoch: bigint): bigint {
    if (epoch <= epochSchedule.firstNormalEpoch) {
        return (2n ** epoch - 1n) * MINIMUM_SLOTS_PER_EPOCH;
    }
    return (epoch - epochSchedule.firstNormalEpoch) * epochSchedule.slotsPerEpoch + epochSchedule.firstNormalSlot;
}

export function getLastSlotInEpoch(epochSchedule: EpochSchedule, epoch: bigint): bigint {
    return getFirstSlotInEpoch(epochSchedule, epoch + 1n) - 1n;
}
