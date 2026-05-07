'use client';

// Reuse note: production fetching uses `useAccountInfo` from `@providers/accounts`,
// which provides batched fetches, parsed/raw modes, NFT enrichment, and a shared
// cluster-aware cache. This isolated hook deliberately bypasses all of that so the
// thumbnail playground can run without any provider tree.

import { Connection, type ParsedAccountData, PublicKey } from '@solana/web3.js';
import useSWR from 'swr';

const MAINNET_RPC_URL = process.env.NEXT_PUBLIC_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com';

export type ParsedAccountThumbnailInfo = {
    pubkey: string;
    owner: string;
    lamports: number;
    executable: boolean;
    space: number;
    program: string;
    parsed: { type: string; info: Record<string, unknown> };
};

export type AccountThumbnailFetchResult =
    | { kind: 'parsed'; account: ParsedAccountThumbnailInfo }
    | { kind: 'raw'; pubkey: string; owner: string; lamports: number; space: number }
    | { kind: 'missing'; pubkey: string };

export function useAccountThumbnailData(address: string) {
    return useSWR<AccountThumbnailFetchResult>(
        address ? ['account-thumbnail', address] : null,
        async () => fetchAccountForThumbnail(address),
        {
            // Cached by key — revisiting an address returns instantly from cache.
            // `keepPreviousData` is intentionally OFF so switching to a new (uncached)
            // address shows the skeleton instead of the previous card.
            dedupingInterval: 60_000,
            revalidateIfStale: false,
            revalidateOnFocus: false,
            revalidateOnReconnect: false,
        },
    );
}

async function fetchAccountForThumbnail(address: string): Promise<AccountThumbnailFetchResult> {
    const connection = new Connection(MAINNET_RPC_URL, 'confirmed');
    const pubkey = new PublicKey(address);
    const result = await connection.getParsedAccountInfo(pubkey);

    if (!result.value) {
        return { kind: 'missing', pubkey: address };
    }

    const { data, owner, lamports, executable } = result.value;

    if (isParsedAccountData(data)) {
        return {
            account: {
                executable,
                lamports,
                owner: owner.toBase58(),
                parsed: data.parsed,
                program: data.program,
                pubkey: address,
                space: data.space,
            },
            kind: 'parsed',
        };
    }

    return {
        kind: 'raw',
        lamports,
        owner: owner.toBase58(),
        pubkey: address,
        space: data.length,
    };
}

function isParsedAccountData(data: ParsedAccountData | Buffer | Uint8Array): data is ParsedAccountData {
    return typeof data === 'object' && data !== null && 'parsed' in data && 'program' in data;
}
