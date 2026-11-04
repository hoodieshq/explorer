import 'client-only';

import { trimNullPadding } from '@entities/nft';
import { isTokenProgramData, useAccountInfo, useFetchAccountInfo } from '@providers/accounts';
import { PublicKey } from '@solana/web3.js';
import React from 'react';

// REVIEW(HOO-921): the collection the header variants show next to the verified mark. Remove with the variants.

/**
 * Loads the collection's mint account (once) and reads its name from the collection NFT's metadata. `loaded` turns
 * true once the account arrives; the name stays undefined while it loads or when the metadata has none.
 */
export function useNftCollection(address: string | undefined): { loaded: boolean; name?: string } {
    const info = useAccountInfo(address);
    const fetchAccountInfo = useFetchAccountInfo();

    React.useEffect(() => {
        if (address && !info) fetchAccountInfo(new PublicKey(address), 'parsed');
    }, [fetchAccountInfo, address]); // eslint-disable-line react-hooks/exhaustive-deps

    const parsed = info?.data?.data.parsed;
    const name = parsed && isTokenProgramData(parsed) ? trimNullPadding(parsed.nftData?.metadata.name ?? '') : '';
    return { loaded: info?.data !== undefined, name: name !== '' ? name : undefined };
}
