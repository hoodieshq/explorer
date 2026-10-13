'use client';

import { getRpc } from '@entities/cluster';
import { sha256 } from '@noble/hashes/sha256';
import { useCluster } from '@providers/cluster';
import { useCallback, useMemo } from 'react';
import useSWRMutation from 'swr/mutation';

import { toHex } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';

import { simulateTransaction, type SimulationResult } from '../lib/simulate-transaction';

export type SimulationState =
    | { status: 'idle'; simulate: () => void }
    | { status: 'simulating' }
    | { status: 'done'; result: SimulationResult; simulate: () => void }
    | { status: 'error'; error: string; simulate: () => void };

type AccountBalances = { preBalances: number[]; postBalances: number[] };

type SimulationArg = {
    messageBytes: Uint8Array;
    cluster: ReturnType<typeof useCluster>['cluster'];
    accountBalances: AccountBalances | undefined;
};

export function useSimulation(messageBytes: Uint8Array, accountBalances?: AccountBalances): SimulationState {
    const { cluster, url } = useCluster();

    // Fingerprint the message so the SWR key changes when the transaction changes,
    // preventing stale cached data from flashing for a different transaction.
    const messageFingerprint = useMemo(() => toHex(sha256(messageBytes)), [messageBytes]);

    const { trigger, data, error, isMutating } = useSWRMutation(
        ['simulate', url, messageFingerprint],
        (_key: unknown, { arg }: { arg: SimulationArg }) =>
            simulateTransaction({
                accountBalances: arg.accountBalances,
                cluster: arg.cluster,
                messageBytes: arg.messageBytes,
                rpc: getRpc(url),
            }),
        {
            onError: (cause: unknown) => {
                Logger.error(new Error('Simulation failed', { cause }));
            },
            throwOnError: false,
        },
    );

    const simulate = useCallback(
        () => void trigger({ accountBalances, cluster, messageBytes }),
        [trigger, accountBalances, cluster, messageBytes],
    );

    if (isMutating) return { status: 'simulating' };

    if (error) {
        return {
            error: error instanceof Error ? error.message : 'Unknown error',
            simulate,
            status: 'error',
        };
    }

    if (data) {
        return {
            result: data,
            simulate,
            status: 'done',
        };
    }

    return { simulate, status: 'idle' };
}
