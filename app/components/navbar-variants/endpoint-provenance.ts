import { clusterSelection, getWhitelistedRpcHostnames, parseRpcEndpoint } from '@entities/cluster';
import { Cluster, CLUSTERS, clusterUrl } from '@utils/cluster';

/**
 * Whether an endpoint is one the app itself knows: an endpoint it ships with (whatever this deployment
 * configured its clusters to talk to), or a host the deployment put on its whitelist. Those are the two
 * ways an address can be *known* rather than merely accepted — and the whitelist is the same input
 * `decideCustomUrl` uses when it lets an endpoint through without a consent prompt.
 *
 * Two things deliberately do not count:
 *
 * - **Your own machine.** `localhost` needs no consent, which is a fact about reach, not about trust: a
 *   validator on your desk is yours, not vetted. Marking it "known" put a badge of the deployment's
 *   confidence on something the deployment has never seen.
 * - **A per-user approval.** "I clicked yes once" is consent. A tick that appeared the moment you agreed
 *   would be telling you what you did rather than anything about the endpoint.
 *
 * `useCluster`'s own `known` is a third, coarser question — "is the app on a cluster it ships with?" —
 * under which every custom endpoint is unknown, this list included.
 */
export function isKnownEndpoint(url: string): boolean {
    return endpointProvenance(url) === 'known';
}

/**
 * Three answers rather than two, because "your own machine" is neither of the other two.
 *
 * - `known` — an endpoint the app ships with, or a host on the deployment's whitelist. Somebody vouched.
 * - `local` — the reader's own machine. Nobody vouched and nobody needs to: there is no third party to
 *   trust, so a badge either way would be a verdict on the reader's own desk. Marked with nothing.
 * - `unknown` — a remote endpoint nobody has vouched for. The one case worth a mark, because it is the one
 *   where the numbers on the page come from a stranger.
 *
 * `undefined` is the shipping-cluster case — no custom endpoint at all — and is `known` by definition.
 */
export type EndpointProvenance = 'known' | 'local' | 'unknown';

export function endpointProvenance(url: string | undefined): EndpointProvenance {
    if (url === undefined) return 'known';
    const endpoint = parseRpcEndpoint(url);
    if (endpoint === undefined) return 'unknown';
    if (endpoint.isLocal) return 'local';
    if (getWhitelistedRpcHostnames().includes(endpoint.hostname)) return 'known';
    // By origin, not hostname: a deployment can point a cluster at a proxy on a particular port of a host
    // it also uses for other things, and only that port is the endpoint it ships with.
    const shipsWithIt = CLUSTERS.filter(net => net !== Cluster.Custom).some(
        net => parseRpcEndpoint(clusterUrl(clusterSelection(net)))?.origin === endpoint.origin,
    );
    return shipsWithIt ? 'known' : 'unknown';
}
