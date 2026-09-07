import 'client-only';

import { useAtomValue, useSetAtom } from 'jotai';

import { removeSavedClusterAtom, type SavedCluster, savedClustersAtom } from '../lib/cluster-storage';

export type { SavedCluster };

/**
 * The kept endpoints and the way to drop one, read once for a whole surface so its consumers share one
 * subscription and agree on the value within a render.
 *
 * A client module rather than a re-export of the atoms: the feature's `index.ts` is imported by the root
 * layout, a server component, and `lib/cluster-storage.ts` reaches the cluster entity's hooks — exposing
 * it through the index put `useSearchParams` into the server module graph and failed the build.
 */
export function useSavedClusters() {
    return {
        removeSavedCluster: useSetAtom(removeSavedClusterAtom),
        savedClusters: useAtomValue(savedClustersAtom),
    };
}
