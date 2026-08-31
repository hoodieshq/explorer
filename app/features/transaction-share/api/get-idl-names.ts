import { type ProgramIdlNames, resolveProgramIdlNames } from '@entities/idl/server';
import { type ServerCluster, serverClusterUrl } from '@utils/cluster';
import { type BackoffOptions } from '@utils/with-backoff';

import { Logger } from '@/app/shared/lib/logger';

// One retry to keep an OG image render fast.
const IDL_BACKOFF: BackoffOptions = { initialDelay: 200, maxRetries: 1 };

/**
 * IDL-derived names for a set of programs, keyed by program id. An absent key means no IDL named that
 * program - whether it has none, is a builtin, or its resolution failed after the entity's retry.
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

    const names = new Map<string, ProgramIdlNames>();

    // Every task catches, so one program's failure never drops the names for the rest of the set.
    await Promise.all(
        resolvable.map(async programId => {
            try {
                const resolved = await resolveProgramIdlNames(url, programId, IDL_BACKOFF);
                if (resolved) names.set(programId, resolved);
            } catch (error) {
                Logger.error(
                    new Error('[transaction-share] IDL names unavailable for this program', { cause: error }),
                    {
                        cluster,
                        programId,
                    },
                );
            }
        }),
    );

    return names;
}
