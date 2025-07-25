import { useCluster } from '@/app/providers/cluster';
import { Cluster, clusterSlug } from '@/app/utils/cluster';

const BASE_URL = 'https://explorer.solana.com';

export function useExplorerLink(path: string) {
    const { cluster, customUrl } = useCluster();

    // Base explorer URL
    const baseUrl = BASE_URL;

    // Build the full URL with path
    let url = `${baseUrl}${path}`;

    // Add cluster query parameter for non-mainnet clusters
    const params = new URLSearchParams();

    switch (cluster) {
        case Cluster.Testnet:
            params.append('cluster', clusterSlug(cluster));
            break;
        case Cluster.Devnet:
            params.append('cluster', clusterSlug(cluster));
            break;
        case Cluster.Custom:
            params.append('cluster', clusterSlug(cluster));
            if (customUrl) {
                params.append('customUrl', customUrl);
            }
            break;
        case Cluster.MainnetBeta:
        default:
            // Mainnet doesn't need cluster parameter
            break;
    }

    // Add query parameters if any
    const queryString = params.toString();
    if (queryString) {
        url += `?${queryString}`;
    }

    return { link: url };
}
