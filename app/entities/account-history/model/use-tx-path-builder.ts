'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { pickClusterParams } from '@/app/utils/url';

/**
 * Returns a `(signature) => "/tx/<sig>?cluster=..."` builder that snapshots the current
 * cluster query string once per render. Lets per-row presentational components stay
 * hook-free — the parent calls this once and threads the resulting function down.
 */
export function useTxPathBuilder(): (signature: string) => string {
    const searchParams = useSearchParams();
    return useMemo(() => {
        const suffix = pickClusterParams('', searchParams ?? undefined);
        return (signature: string) => `/tx/${signature}${suffix}`;
    }, [searchParams]);
}
