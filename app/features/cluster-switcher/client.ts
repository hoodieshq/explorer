import 'client-only';

// Off `index.ts` so that barrel stays universal: `app/layout.tsx` is a server component and reaches the
// barrel for `ClusterModal`, so a hook re-exported alongside it lands in the server graph — and these
// hooks read the URL, which is a client-only thing to do. The components stay on `index.ts`: a `use
// client` component is a boundary a server module may import, a hook is not.
export { useClusterHref } from './model/use-cluster-href';
export { type CustomUrlDraft, useCustomUrlDraft } from './model/use-custom-url-draft';
export { type SavedCluster, useSavedClusters } from './model/use-saved-clusters';
// The naming rules themselves, for a surface that lays the save flow out itself rather than mounting
// `SaveClusterForm`: the cap, the normalization storage holds names in, and the suggested default. Pure
// functions, but they reach the cluster entity's barrel for `parseRpcEndpoint`, and that barrel carries
// the `useSearchParams` hooks — re-exported from `index.ts` they put those into the server graph and the
// whole app 500s on `You're importing a module that depends on useSearchParams`.
export { MAX_CLUSTER_NAME_LENGTH, normalizeClusterName, suggestClusterName } from './lib/cluster-name';
