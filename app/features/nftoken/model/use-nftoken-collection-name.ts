import 'client-only';

import { useAccountInfo, useFetchAccountInfo } from '@providers/accounts';
import type { Address } from '@solana/kit';
import { PublicKey } from '@solana/web3.js';
import React from 'react';

import { parseNftokenAccount } from '../lib/nftoken-accounts';
import { useNftokenMetadata } from './use-nftoken-metadata';

/**
 * The name of an NFT's collection: loads the collection account (once), then its metadata. Undefined while either
 * loads, when the address holds no NFToken collection, or when its metadata has no name.
 */
export function useNftokenCollectionName(address: Address | undefined): string | undefined {
    const fetchAccountInfo = useFetchAccountInfo();
    const entry = useAccountInfo(address);

    React.useEffect(() => {
        // `parsed`, like the address page: the collection's own page then finds the account already in the cache.
        if (address && !entry) fetchAccountInfo(new PublicKey(address), 'parsed');
    }, [fetchAccountInfo, address]); // eslint-disable-line react-hooks/exhaustive-deps

    const collection = entry?.data && parseNftokenAccount(entry.data);
    const metadata = useNftokenMetadata(collection?.kind === 'collection' ? collection.metadata_url : undefined);
    return metadata.kind === 'loaded' ? metadata.metadata.name : undefined;
}
