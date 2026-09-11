import { notFound } from 'next/navigation';

import { NAV_VARIANTS_ENABLED } from '@/app/components/navbar-variants/nav-variant-storage';

import { ConsentDialogs } from './ConsentDialogs';

/** Gated on the same flag as the rest of the review tooling, so the route does not exist in production. */
export async function generateMetadata() {
    if (!NAV_VARIANTS_ENABLED) notFound();
    return {
        description: 'Both custom RPC consent dialogs, side by side',
        title: 'Custom RPC consent dialogs | Solana',
    };
}

export default function ConsentDialogsPage() {
    if (!NAV_VARIANTS_ENABLED) notFound();
    return <ConsentDialogs />;
}
