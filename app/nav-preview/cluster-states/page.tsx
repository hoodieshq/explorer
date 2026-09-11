import { notFound } from 'next/navigation';

import { NAV_VARIANTS_ENABLED } from '@/app/components/navbar-variants/nav-variant-storage';

import { ClusterStates } from './ClusterStates';

/** Gated on the same flag as the rest of the review tooling, so the route does not exist in production. */
export async function generateMetadata() {
    if (!NAV_VARIANTS_ENABLED) notFound();
    return {
        description: 'Every state of the cluster selector, side by side',
        title: 'Cluster selector states | Solana',
    };
}

export default function ClusterStatesPage() {
    if (!NAV_VARIANTS_ENABLED) notFound();
    return <ClusterStates />;
}
