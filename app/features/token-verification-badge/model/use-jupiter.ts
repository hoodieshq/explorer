import useSWR from 'swr';

import { useCluster } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';

import { TOKEN_VERIFICATION_SWR_CONFIG } from './token-verification-cache';

export enum JupiterStatus {
    Success,
    FetchFailed,
    Loading,
}

export type JupiterResult = {
    verified: boolean;
    status: JupiterStatus;
};

type JupiterSwrKey = ['jupiter-verification', string];

function getJupiterSwrKey(cluster: Cluster, mintAddress?: string): JupiterSwrKey | null {
    if (!mintAddress || cluster !== Cluster.MainnetBeta) {
        return null;
    }

    return ['jupiter-verification', mintAddress];
}

async function fetchJupiterVerification([, mintAddress]: JupiterSwrKey): Promise<JupiterResult> {
    try {
        const response = await fetch(`/api/jupiter/${mintAddress}`);

        if (!response.ok) {
            return { status: JupiterStatus.FetchFailed, verified: false };
        }

        const data = (await response.json()) as { verified?: boolean };
        return { status: JupiterStatus.Success, verified: data.verified === true };
    } catch {
        return { status: JupiterStatus.FetchFailed, verified: false };
    }
}

export function useJupiterVerification(mintAddress?: string): JupiterResult | undefined {
    const { cluster } = useCluster();
    const swrKey = getJupiterSwrKey(cluster, mintAddress);
    const { data, isLoading } = useSWR(swrKey, fetchJupiterVerification, TOKEN_VERIFICATION_SWR_CONFIG);

    if (isLoading && !data) {
        return { status: JupiterStatus.Loading, verified: false };
    }

    return data || { status: JupiterStatus.FetchFailed, verified: false };
}
