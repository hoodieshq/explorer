import useSWR from 'swr';

import { useCluster } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';

import { TOKEN_VERIFICATION_SWR_CONFIG } from './token-verification-cache';

export enum BlupryntStatus {
    Success,
    FetchFailed,
    Loading,
    NotFound,
}

export type BlupryntResult = {
    verified: boolean;
    status: BlupryntStatus;
};

type BlupryntSwrKey = ['bluprynt-verification', string];

function getBlupryntSwrKey(cluster: Cluster, mintAddress?: string): BlupryntSwrKey | null {
    if (!mintAddress || cluster !== Cluster.MainnetBeta) {
        return null;
    }

    return ['bluprynt-verification', mintAddress];
}

export function parseApiResponse(data: { verified: boolean }): BlupryntResult {
    return {
        status: data.verified ? BlupryntStatus.Success : BlupryntStatus.NotFound,
        verified: data.verified,
    };
}

async function fetchBlupryntVerification([, mintAddress]: BlupryntSwrKey): Promise<BlupryntResult> {
    try {
        const response = await fetch(`/api/bluprynt/${mintAddress}`);

        if (!response.ok) {
            return { status: BlupryntStatus.FetchFailed, verified: false };
        }

        const data: { verified: boolean } = await response.json();
        return parseApiResponse(data);
    } catch {
        return { status: BlupryntStatus.FetchFailed, verified: false };
    }
}

export function useBlupryntVerification(mintAddress?: string): BlupryntResult | undefined {
    const { cluster } = useCluster();
    const swrKey = getBlupryntSwrKey(cluster, mintAddress);
    const { data, isLoading } = useSWR(swrKey, fetchBlupryntVerification, TOKEN_VERIFICATION_SWR_CONFIG);

    if (isLoading && !data) {
        return { status: BlupryntStatus.Loading, verified: false };
    }

    return data || { status: BlupryntStatus.FetchFailed, verified: false };
}
