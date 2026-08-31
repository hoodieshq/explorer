import { fetchTransactionDetails, type TransactionWithMeta } from '@entities/transaction-data';
import { type ServerCluster, serverClusterUrl } from '@utils/cluster';

/**
 * The transaction behind an OG image, read from a cluster that is already resolved.
 *
 * @param cluster - The cluster to read from, never Custom - see `ServerCluster`
 * @param signature - The transaction signature from the route
 */
export async function getTx({
    cluster,
    signature,
}: {
    cluster: ServerCluster;
    signature: string;
}): Promise<TransactionWithMeta | null> {
    return fetchTransactionDetails(serverClusterUrl(cluster), signature);
}
