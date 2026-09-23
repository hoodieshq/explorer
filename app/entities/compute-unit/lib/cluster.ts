import type { SupportedCluster } from '@explorer/parsers/programs/compute-budget';
import { Cluster } from '@utils/cluster';

// The package keys its schedule by name rather than by the app's enum, so the two map here once.
const CLUSTER_NAMES: Record<Cluster, SupportedCluster> = {
    [Cluster.Custom]: 'custom',
    [Cluster.Devnet]: 'devnet',
    [Cluster.MainnetBeta]: 'mainnet-beta',
    [Cluster.Testnet]: 'testnet',
};

export function toSupportedCluster(cluster: Cluster): SupportedCluster {
    return CLUSTER_NAMES[cluster];
}
