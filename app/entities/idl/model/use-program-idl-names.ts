'use client';

import { shouldUseDirectRpc } from '@entities/cluster/@x/idl';
import { useMemo } from 'react';
import useSWRImmutable from 'swr/immutable';

import { Logger } from '@/app/shared/lib/logger';
import { type Cluster } from '@/app/utils/cluster';

import { NON_ANCHOR_PROGRAMS } from '../api/config';
import { fetchProgramIdls } from '../api/fetch-program-idls';
import { type ProgramIdlPair } from '../api/types';
import { applyIdlSelection } from './custom-idl/apply-idl-selection';
import { useProgramIdlPreferences } from './custom-idl/use-program-idl-preference';
import { buildProgramIdlNames, type InstructionNameResolver, type ProgramIdlNames } from './instruction-name-table';

export type { InstructionNameResolver, ProgramIdlNames };

/**
 * Per-program names built from each program's IDL: a display name plus an instruction-name resolver
 * (matched by discriminator, no Borsh decode). One SWR entry covers the whole set so the caller can
 * resolve names without any per-row data hooks — the list/line components stay pure. Builtins and
 * custom/localhost clusters resolve to nothing, unless the user selected a custom IDL for the program.
 *
 * The last source `transaction-data` tries and the only one that fetches, so an empty map means "no
 * IDL", never "nothing is named yet".
 */
export function useProgramIdlNames(programIds: string[], cluster: Cluster, url: string): Map<string, ProgramIdlNames> {
    const preferences = useProgramIdlPreferences();
    // A selected custom IDL needs no fetch, and strict selection means the on-chain IDLs must not name it.
    const customSelected = useMemo(
        () => [...new Set(programIds)].filter(id => preferences[id]?.selected === 'custom' && preferences[id]?.custom),
        [programIds, preferences],
    );
    const resolvable = useMemo(
        () =>
            shouldUseDirectRpc(cluster, url)
                ? []
                : [...new Set(programIds)]
                      .filter(id => !NON_ANCHOR_PROGRAMS.has(id) && !customSelected.includes(id))
                      .sort(),
        [programIds, cluster, url, customSelected],
    );

    // Keyed on the whole resolvable set, not per program. In practice resolvable is almost always a
    // single program, so this behaves as a per-program key; the coarser key only forgoes cross-signature
    // reuse for the rare multi-program set, which isn't worth splitting into per-program SWR entries.
    const { data } = useSWRImmutable(
        resolvable.length > 0 ? (['idl-instruction-names', cluster, resolvable.join(',')] as const) : false,
        async () => {
            // allSettled, not all: one program's failed IDL fetch shouldn't drop names for the rest of
            // the set. Only a total failure throws, so SWR retries the batch — under useSWRImmutable a
            // returned value is cached as a permanent success, so we must not cache "no IDLs" from a
            // transient outage that happened to hit every program.
            const settled = await Promise.allSettled(resolvable.map(id => fetchProgramIdls(id, cluster)));
            settled.forEach((result, i) => {
                // A dropped rejection is otherwise indistinguishable from "still loading" and from "this
                // program has no IDL": all three render the same unnamed instruction. Log it so the
                // difference is recoverable when someone reports missing names.
                if (result.status === 'rejected') {
                    // sentryExtras, not plain context: this runs in the browser, where console output is
                    // suppressed (NEXT_LOG_LEVEL is server-only) and context outside sentryExtras is
                    // console-only — so a plain field would leave the event with no reason attached.
                    Logger.warn('[idl] IDL fetch failed; instruction names unavailable for this program', {
                        sentry: true,
                        sentryExtras: { cluster, programId: resolvable[i], reason: String(result.reason) },
                    });
                }
            });
            const resolved = settled.flatMap((result, i) =>
                result.status === 'fulfilled' ? [[resolvable[i], result.value] as const] : [],
            );
            if (resolved.length === 0) throw new Error('idl-instruction-names: every IDL fetch failed');
            return resolved;
        },
        { errorRetryCount: 3 },
    );

    return useMemo(() => {
        const resolvers = new Map<string, ProgramIdlNames>();
        const named: (readonly [string, ProgramIdlPair])[] = [
            ...(data ?? []),
            ...customSelected.map(id => [id, EMPTY_IDL_PAIR] as const),
        ];
        for (const [id, onChain] of named) {
            const idls = applyIdlSelection(onChain, preferences[id]);
            // Program-metadata IDL is preferred; Anchor only names what program-metadata can't.
            const names = buildProgramIdlNames([idls.programMetadataIdl, idls.anchorIdl]);
            if (names) resolvers.set(id, names);
        }
        return resolvers;
    }, [data, customSelected, preferences]);
}

const EMPTY_IDL_PAIR: ProgramIdlPair = {
    anchorIdl: undefined,
    anchorIdlAddress: undefined,
    programMetadataIdl: undefined,
    programMetadataIdlAddress: undefined,
};
