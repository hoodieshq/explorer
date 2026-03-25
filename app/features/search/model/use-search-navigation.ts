import { useCluster } from '@providers/cluster';
import { clusterSlug } from '@utils/cluster';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

import { pickClusterParams } from '@/app/utils/url';

import type { SearchItem } from '../lib/types';

export function useSearchNavigation(): (option: SearchItem) => void {
    const router = useRouter();
    const { cluster } = useCluster();
    const searchParams = useSearchParams();

    return useCallback(
        (option: SearchItem) => {
            const { pathname } = option;
            if (pathname.includes('?')) {
                const [path, currentSearchParamsString] = pathname.split('?');
                const nextPath = pickClusterParams(
                    path,
                    new URLSearchParams(currentSearchParamsString),
                    new URLSearchParams(`cluster=${clusterSlug(cluster)}`),
                );
                router.push(nextPath);
            } else {
                const nextQueryString = searchParams?.toString();
                router.push(`${pathname}${nextQueryString ? `?${nextQueryString}` : ''}`);
            }
        },
        [cluster, router, searchParams],
    );
}
