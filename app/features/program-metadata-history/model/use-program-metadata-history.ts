'use client';

import { useAccountHistory } from '@entities/account-history';
import { type Address } from '@solana/kit';

import { fetchMetadataHistory, type MetadataHistoryResult } from '../api/fetch-metadata-history';

export function useProgramMetadataHistory(programAddress: Address, seed: string) {
    return useAccountHistory<MetadataHistoryResult>('program-metadata-history', [programAddress, seed], url =>
        fetchMetadataHistory(programAddress, seed, url),
    );
}
