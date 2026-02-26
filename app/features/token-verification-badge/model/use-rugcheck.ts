import useSWR from 'swr';

import { useCluster } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';

import { TOKEN_VERIFICATION_SWR_CONFIG } from './token-verification-cache';
import { RISK_MAX_LEVEL_GOOD, RISK_MAX_LEVEL_WARNING } from '../config';

export enum RugCheckStatus {
    Success,
    FetchFailed,
    Loading,
    RateLimited,
}

export type RugCheckResult = {
    score?: number;
    status: RugCheckStatus;
};

export enum ERiskLevel {
    Good = 'Good',
    Warning = 'Warning',
    Danger = 'Danger',
}

type RugCheckSwrKey = ['rugcheck', string];

function getRiskLevel(score: number): ERiskLevel {
    if (score <= RISK_MAX_LEVEL_GOOD) return ERiskLevel.Good;
    if (score <= RISK_MAX_LEVEL_WARNING) return ERiskLevel.Warning;
    return ERiskLevel.Danger;
}

function getRugCheckSwrKey(cluster: Cluster, mintAddress?: string): RugCheckSwrKey | null {
    if (!mintAddress || cluster !== Cluster.MainnetBeta) {
        return null;
    }

    return ['rugcheck', mintAddress];
}

async function fetchRugCheckVerification([, mintAddress]: RugCheckSwrKey): Promise<RugCheckResult> {
    try {
        const response = await fetch(`/api/rugcheck/${mintAddress}`);

        if (!response.ok) {
            if (response.status === 429) {
                return { score: undefined, status: RugCheckStatus.RateLimited };
            }
            return { score: undefined, status: RugCheckStatus.FetchFailed };
        }

        const data = (await response.json()) as { score?: number };
        return { score: data.score, status: RugCheckStatus.Success };
    } catch {
        return { score: undefined, status: RugCheckStatus.FetchFailed };
    }
}

export function useRugCheckVerification(mintAddress?: string): RugCheckResult | undefined {
    const { cluster } = useCluster();
    const swrKey = getRugCheckSwrKey(cluster, mintAddress);
    const { data, isLoading } = useSWR(swrKey, fetchRugCheckVerification, TOKEN_VERIFICATION_SWR_CONFIG);

    if (isLoading && !data) {
        return { score: undefined, status: RugCheckStatus.Loading };
    }

    return data || { score: undefined, status: RugCheckStatus.FetchFailed };
}

export { getRiskLevel };
