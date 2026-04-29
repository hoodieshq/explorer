'use client';

import { useAccountHistory } from '@entities/account-history';
import { type Address } from '@solana/kit';

import { type AnchorIdlHistoryResult, fetchAnchorIdlHistory } from '../api/fetch-idl-history';

export function useAnchorIdlHistory(programAddress: Address) {
    return useAccountHistory<AnchorIdlHistoryResult>('anchor-idl-history', [programAddress], url =>
        fetchAnchorIdlHistory(programAddress, url),
    );
}
