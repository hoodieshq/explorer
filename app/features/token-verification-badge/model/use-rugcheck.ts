import React from 'react';

import { useCluster } from '@/app/providers/cluster';
import { Cluster } from '@/app/utils/cluster';

export enum RugCheckStatus {
    Success,
    FetchFailed,
    Loading,
}

export type RugCheckResult = {
    score: number;
    status: RugCheckStatus;
};

export enum ERiskLevel {
    Good = 'Good',
    Warning = 'Warning',
    Danger = 'Danger',
}
export const RISK_MAX_LEVEL_GOOD = 25;
export const RISK_MAX_LEVEL_WARNING = 65;

function getRiskLevel(score: number): ERiskLevel {
    if (score <= RISK_MAX_LEVEL_GOOD) return ERiskLevel.Good;
    if (score <= RISK_MAX_LEVEL_WARNING) return ERiskLevel.Warning;
    return ERiskLevel.Danger;
}

export function useRugCheck(mintAddress?: string): RugCheckResult | undefined {
    const { cluster } = useCluster();
    const [result, setResult] = React.useState<RugCheckResult>();

    React.useEffect(() => {
        if (!mintAddress || cluster !== Cluster.MainnetBeta) {
            return;
        }

        let stale = false;

        const checkRisk = async () => {
            setResult({ score: 0, status: RugCheckStatus.Loading });

            try {
                const response = await fetch(`/api/rugcheck/${mintAddress}`);

                if (stale) return;

                if (!response.ok) {
                    setResult({ score: 0, status: RugCheckStatus.FetchFailed });
                    return;
                }

                const data = await response.json();
                setResult({ score: data.score, status: RugCheckStatus.Success });
            } catch {
                setResult({ score: 0, status: RugCheckStatus.FetchFailed });
            }
        };

        checkRisk();

        return () => {
            stale = true;
        };
    }, [mintAddress, cluster]);

    return result;
}

export { getRiskLevel };
