'use client';

import { shouldUseDirectRpc } from '@entities/cluster/@x/idl';
import useSWRImmutable from 'swr/immutable';

import { type Cluster } from '@/app/utils/cluster';

import { fetchProgramIdls } from '../api/fetch-program-idls';
import { resolveProgramIdlsClient } from '../api/load-resolve-program-idls';
import { type ProgramIdlPair } from '../api/types';
import { applyIdlSelection, type SelectedProgramIdls } from './custom-idl/apply-idl-selection';
import { useProgramIdlPreference } from './custom-idl/use-program-idl-preference';

export type ProgramIdls = SelectedProgramIdls & {
    isLoading: boolean;
    /** The program's on-chain IDLs before the user's selection, for the IDL source selector. */
    onChainIdls: ProgramIdlPair;
};

/**
 * Resolves both IDLs a program exposes (Anchor PDA, PMP `idl` seed). Shared by the IDL card, the
 * Anchor tx-decoder (`useAnchorProgram`), and the program-name label (`useProgramMetadataIdl`) so all
 * three read one cached resolution and never surface divergent IDLs for a program.
 *
 * Known public clusters use a single server route (`/api/idl-latest`) backed by `@solana/idl`, which
 * surfaces native-program IDLs via the fndn fallback authority. Custom / localhost clusters can't use
 * that route — the server has no route to a user's local validator — so `resolveProgramIdlsClient`
 * runs the *same* `@solana/idl` resolver in the browser against the user-supplied RPC URL, loaded via
 * dynamic `import()` so `@solana/idl`'s weight stays out of the bundle for the common known-cluster
 * path (which never resolves IDLs in the browser).
 *
 * The user's IDL preference (see `applyIdlSelection`) is applied here, so every consumer reads the same
 * selected IDL: a custom IDL replaces both on-chain sources, and `isCustomIdl` tells the surface to
 * highlight what it renders from it.
 *
 * `suspense` opts the read into React Suspense (the program-name label renders inside a boundary);
 * other callers leave it off.
 *
 * `onChainOnly` skips the preference for a caller that reads another program's accounts for the Explorer's
 * own use (Squads multisig members, verified-build status): that card has no IDL selector and no highlight,
 * so a custom IDL there would change it with nothing on the page to show why or to switch back.
 */
export function useProgramIdls(
    programId: string,
    url: string,
    cluster: Cluster,
    { onChainOnly = false, suspense = false }: { onChainOnly?: boolean; suspense?: boolean } = {},
): ProgramIdls {
    const isCustom = shouldUseDirectRpc(cluster, url);

    const { data: serverIdls, isLoading: serverLoading } = useSWRImmutable(
        !isCustom && (['program-idls', programId, cluster] as const),
        () => fetchProgramIdls(programId, cluster),
        // fetchProgramIdls throws on failure (rather than caching an empty result), so cap the
        // retries SWR makes before giving up on a persistently failing endpoint.
        { errorRetryCount: 3, suspense },
    );

    // Custom / local clusters: resolve client-side against the user's RPC. Keyed off `url` so a
    // different endpoint re-resolves; the key is `false` for known clusters so this never runs there
    // (no double-fetch, and the heavy `@solana/idl` chunk only loads when this branch is taken).
    const { data: customIdls, isLoading: customLoading } = useSWRImmutable(
        isCustom && (['program-idls-custom', programId, url] as const),
        () => resolveProgramIdlsClient({ programId, url }),
        // resolveProgramIdlsClient re-throws when nothing resolved and a source errored, so cap the
        // retries (matching the server path) before giving up on a persistently failing local RPC.
        { errorRetryCount: 3, suspense },
    );

    const { preference } = useProgramIdlPreference(programId);
    const resolved = isCustom ? customIdls : serverIdls;
    const onChainIdls: ProgramIdlPair = {
        anchorIdl: resolved?.anchorIdl,
        anchorIdlAddress: resolved?.anchorIdlAddress,
        programMetadataIdl: resolved?.programMetadataIdl,
        programMetadataIdlAddress: resolved?.programMetadataIdlAddress,
    };
    const selected = applyIdlSelection(onChainIdls, onChainOnly ? undefined : preference);

    return {
        ...selected,
        // A selected custom IDL is already in hand; only the selector still waits for the on-chain list.
        isLoading: selected.isCustomIdl ? false : isCustom ? customLoading : serverLoading,
        onChainIdls,
    };
}
