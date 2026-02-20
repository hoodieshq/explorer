import React from 'react';

import { useCluster } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';

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
                setResult({ status: JupiterStatus.Success, verified: data.verified === true });
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
