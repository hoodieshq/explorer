import { createSolanaRpc, signature as createSignature } from '@solana/kit';
import { type ServerCluster, serverClusterUrl } from '@utils/cluster';

/**
 * Where a signature was found, or why the search stopped short.
 *
 * `error` names the cluster whose status check failed so a caller can tell a network fault apart from a
 * genuine miss. Probing past a failed check would read the fault as "not on this cluster".
 */
export type FindTransactionClusterResult =
    | { cluster: ServerCluster; kind: 'found' }
    | { kind: 'not-found' }
    | { cluster: ServerCluster; error: Error; kind: 'error' };

/**
 * Walks `clusters` in order and stops at the first one holding the signature.
 *
 * Probe policy belongs to the caller: pass the clusters to try, in the order to try them. No probe-policy env
 * is read here - `serverClusterUrl` still reads the per-cluster `*_RPC_URL`, which is why this lives in
 * `server.ts` - and nothing throws, so each caller maps the result onto its own error type.
 * @param clusters - Clusters to probe, in probe order
 * @param signature - The transaction signature to look for
 */
export async function findTransactionCluster(
    clusters: readonly ServerCluster[],
    signature: string,
): Promise<FindTransactionClusterResult> {
    for (const cluster of clusters) {
        const status = await getSignatureStatus(cluster, signature);

        if ('left' in status) return { cluster, error: status.left, kind: 'error' };
        if (status.right) return { cluster, kind: 'found' };
    }

    return { kind: 'not-found' };
}

type SignatureStatusResult = { left: Error } | { right: boolean };

async function getSignatureStatus(cluster: ServerCluster, signature: string): Promise<SignatureStatusResult> {
    try {
        const rpc = createSolanaRpc(serverClusterUrl(cluster));
        const { value } = await rpc
            .getSignatureStatuses([createSignature(signature)], { searchTransactionHistory: true })
            .send();

        // The RPC returns literal null for a signature it does not hold, per the JSON-RPC spec.
        return { right: Boolean(value[0]) };
    } catch (error) {
        return { left: error instanceof Error ? error : new Error(String(error)) };
    }
}
