import 'client-only';

// Off `index.ts` so that barrel stays universal: `app/layout.tsx` is a server component and reaches the
// barrel for `ClusterModal`, so a hook re-exported alongside it lands in the server graph — and these
// hooks read the URL, which is a client-only thing to do. The components stay on `index.ts`: a `use
// client` component is a boundary a server module may import, a hook is not.
export { useClusterHref } from './model/use-cluster-href';
export { useCustomUrlDraft } from './model/use-custom-url-draft';
export { type SavedCluster, useSavedClusters } from './model/use-saved-clusters';
