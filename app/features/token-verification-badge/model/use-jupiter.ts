import React from 'react';

import { useCluster } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';

import { EVerificationSource } from '../lib/types';
import { createCacheKey, getFromCache, setToCache } from './verification-cache';

export enum JupiterStatus {
    Success,
    FetchFailed,
    Loading,
}

export type JupiterResult = {
    verified: boolean;
    status: JupiterStatus;
};

export function useJupiterVerification(mintAddress?: string): JupiterResult | undefined {
    const { cluster } = useCluster();
    const [result, setResult] = React.useState<JupiterResult>();

    React.useEffect(() => {
        if (!mintAddress || cluster !== Cluster.MainnetBeta) {
            return;
        }

        const cacheKey = createCacheKey(EVerificationSource.Jupiter, mintAddress);
        const cached = getFromCache<JupiterResult>(cacheKey);
        if (cached) {
            setResult(cached);
            return;
        }

        let stale = false;

        const checkVerification = async () => {
            setResult({ status: JupiterStatus.Loading, verified: false });

            try {
                const response = await fetch(`/api/jupiter/${mintAddress}`);

                if (stale) return;

                if (!response.ok) {
                    setResult({ status: JupiterStatus.FetchFailed, verified: false });
                    return;
                }

                const data = await response.json();
                const res: JupiterResult = { status: JupiterStatus.Success, verified: data.verified === true };

                setToCache(cacheKey, res);
                setResult(res);
            } catch {
                setResult({ status: JupiterStatus.FetchFailed, verified: false });
            }
        };

        checkVerification();

        return () => {
            stale = true;
        };
    }, [mintAddress, cluster]);

    return result;
}
