import { getReservedComputeUnits as getPackageReservedComputeUnits } from '@explorer/parsers/programs/compute-budget';
import type { Address } from '@solana/kit';
import { type Cluster, clusterSlug } from '@utils/cluster';

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
        cluster: clusterSlug(cluster),
        epoch,
        programAddress: programId,
    });
}
