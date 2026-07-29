import { Token } from '@solflare-wallet/utl-sdk';
import { getTokenInfoSwrKey } from '@utils/token-info';
import React, { useCallback } from 'react';
import { mutate } from 'swr';

import { TokenInfoBatchContext } from '../../app/entities/token-info/model/token-info-batch-provider';

type MockTokenInfoBatchProviderProps = {
    children: React.ReactNode;
    /** Optional per-mint token info keyed by base58 address. When set, a requested mint's SWR entry is seeded. */
    infos?: Record<string, Partial<Token>>;
};

/**
 * Mock provider for Storybook stories that replaces TokenInfoBatchProvider.
 *
 * By default it is a no-op (no network, no SWR writes). Pass `infos` to seed the SWR cache for requested
 * mints so lazy consumers like OwnedTokensCard show symbols and logos without a backend.
 */
export function MockTokenInfoBatchProvider({ children, infos }: MockTokenInfoBatchProviderProps) {
    const requestTokenInfo = useCallback(
        (address: string, cluster: any, genesisHash?: string) => {
            const info = infos?.[address];
            if (info) mutate(getTokenInfoSwrKey(address, cluster, genesisHash), info, false);
        },
        [infos],
    );

    return <TokenInfoBatchContext.Provider value={requestTokenInfo}>{children}</TokenInfoBatchContext.Provider>;
}
