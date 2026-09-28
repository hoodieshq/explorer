import type { EpochSchedule } from '@explorer/utils';

import type { SupportedCluster } from '../config.js';

// Genesis constants, as each cluster's getEpochSchedule reports them. They never change, so no RPC call is needed.
export const EPOCH_SCHEDULES: Record<SupportedCluster, EpochSchedule> = {
    devnet: { firstNormalEpoch: 0n, firstNormalSlot: 0n, slotsPerEpoch: 432_000n },
    'mainnet-beta': { firstNormalEpoch: 0n, firstNormalSlot: 0n, slotsPerEpoch: 432_000n },
    testnet: { firstNormalEpoch: 14n, firstNormalSlot: 524_256n, slotsPerEpoch: 432_000n },
};
