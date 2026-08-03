import { useAccountInfo, useFetchAccountInfo } from '@providers/accounts';
import { FetchStatus } from '@providers/cache';
import { PublicKey } from '@solana/web3.js';
import React from 'react';

import { decodePmpBufferAccount } from '../lib/decode-pmp-buffer-account';
import type { PmpAccountContent, PmpDecodeConfig } from '../lib/types';

export type PmpAccountPayloadState =
    | { status: 'loading' }
    | { status: 'failed' }
    | { status: 'ready'; content: PmpAccountContent };

/**
 * Reads the payload a PMP account currently holds.
 *
 * `config` must be referentially stable (pass the memoised instruction's own `config`), because it keys the
 * decode memo and a fresh object per render would re-decompress the payload on every render.
 */
export function usePmpAccountPayload({
    address,
    config,
}: {
    address: string;
    config: PmpDecodeConfig;
}): PmpAccountPayloadState {
    const fetchAccountInfo = useFetchAccountInfo();
    const entry = useAccountInfo(address);

    React.useEffect(() => {
        // `entry` guards the re-request: the provider keeps a Fetching entry from the first call onwards, so this
        // fires once per address rather than on every render until the response lands.
        if (entry !== undefined) return;
        fetchAccountInfo(new PublicKey(address), 'raw');
    }, [address, entry, fetchAccountInfo]);

    return React.useMemo(() => {
        if (entry === undefined || entry.status === FetchStatus.Fetching) return { status: 'loading' };
        if (entry.status === FetchStatus.FetchFailed || entry.data === undefined) return { status: 'failed' };

        const { data, lamports, owner } = entry.data;
        return {
            content: decodePmpBufferAccount({
                account: { data: data.raw, lamports, owner: owner.toBase58() },
                config,
            }),
            status: 'ready',
        };
    }, [config, entry]);
}
