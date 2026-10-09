import { getReservedComputeUnits as getPackageReservedComputeUnits } from '@explorer/parsers/programs/compute-budget';
import type { Address } from '@solana/kit';
import { Cluster } from '@utils/cluster';

import { toScheduleCluster } from './cluster';

/** Takes the app's `Cluster` enum and maps it with `toScheduleCluster`, so app callers skip that conversion. */
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
        cluster: toScheduleCluster(cluster),
        epoch,
        programAddress: programId,
    });
}
