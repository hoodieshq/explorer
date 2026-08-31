import { type ProgramIdlNames, resolveProgramIdlNames } from '@entities/idl/server';
import { type ServerCluster, serverClusterUrl } from '@utils/cluster';
import { settleWithin } from '@utils/settle-within';
import { type BackoffOptions } from '@utils/with-backoff';

import { Logger } from '@/app/shared/lib/logger';

// One retry to keep an OG image render fast.
const IDL_BACKOFF: BackoffOptions = { initialDelay: 200, maxRetries: 1 };

// Slack gives an unfurl 3s end to end, and this stage shares that budget with the cluster probe, the
// transaction fetch and the Satori render. Half of it is the most the IDL stage can take and still leave
// room for the rest, so a stalled RPC costs its program a name rather than costing the image.
const IDL_FETCH_BUDGET_MS = 1_500;

/**
 * IDL-derived names for a set of programs, keyed by program id. An absent key means no IDL named that
 * program - whether it has none, is a builtin, its resolution failed after the entity's retry, or it ran
 * past the budget.
 *
 * Never throws: an unnamed row is the same row either way, so a failure here costs names, not an image.
 * @param cluster - The cluster to resolve against, already decided by `getTxShareData`
 * @param programIds - The programs worth an IDL fetch. Duplicates are fine, they cost one resolution
 */
export async function getIdlNames({
    cluster,
    programIds,
}: {
    cluster: ServerCluster;
    programIds: readonly string[];
}): Promise<Map<string, ProgramIdlNames>> {
    const url = serverClusterUrl(cluster);
    // Deduped, so eight instructions from one program cost one resolution.
    const resolvable = [...new Set(programIds)];

    const settled = await settleWithin(
        IDL_FETCH_BUDGET_MS,
        resolvable.map(programId => resolveProgramEntry({ cluster, programId, url })),
    );

    return new Map(settled.flatMap(entry => (entry ? [entry] : [])));
}

/** One program's names as a map entry, or undefined when nothing named it and when the resolution failed. */
async function resolveProgramEntry({
    cluster,
    programId,
    url,
}: {
    cluster: ServerCluster;
    programId: string;
    url: string;
}): Promise<[string, ProgramIdlNames] | undefined> {
    try {
        const resolved = await resolveProgramIdlNames(url, programId, IDL_BACKOFF);
        return resolved ? [programId, resolved] : undefined;
    } catch (error) {
        Logger.error(new Error('[transaction-share] IDL names unavailable for this program', { cause: error }), {
            cluster,
            programId,
        });
        return undefined;
    }
}
