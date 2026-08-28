import { fetchTransactionDetails, type TransactionWithMeta } from '@entities/transaction-data';
import { type ServerCluster, serverClusterUrl } from '@utils/cluster';

/**
 * The transaction behind an OG image, read from a cluster that is already resolved.
 *
 * Orchestrates only: the RPC call lives in the entity and the cluster is decided upstream in
 * `getTxShareData`. That leaves this the single seam to touch when the image needs a second call
 * for the fields the `jsonParsed` encoding drops, so nothing that renders has to change with it.
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
