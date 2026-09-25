import { getReservedComputeUnits as getPackageReservedComputeUnits } from '@explorer/parsers/programs/compute-budget';
import type { Address } from '@solana/kit';
import { Cluster } from '@utils/cluster';

import { toSupportedCluster } from './cluster';

/** Kept on the app's `Cluster` enum so CU profiling on the transaction page needs no edit yet. */
export function getReservedComputeUnits({
    cluster,
    epoch,
    programId,
}: {
    cluster: Cluster;
    epoch?: bigint;
    programId: Address;
}): number {
    return getPackageReservedComputeUnits({
        cluster: toSupportedCluster(cluster),
        epoch,
        programAddress: programId,
    });
}
