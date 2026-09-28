import { getReservedComputeUnits as getPackageReservedComputeUnits } from '@explorer/parsers/programs/compute-budget';
import type { Address } from '@solana/kit';
import { Cluster } from '@utils/cluster';

import { toScheduleCluster } from './cluster';

/** `Uses the app's `Cluster` enum and a string program id, so app callers do not need to perform any conversions. */
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
