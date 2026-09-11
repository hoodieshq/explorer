import type { FetchAccountFn } from '@codama/dynamic-instructions';
import type { SolanaRpc } from '@entities/cluster';
import { type Address, fetchEncodedAccount, type MaybeEncodedAccount } from '@solana/kit';

/**
 * Wrap a `fetchAccount` so each address is requested at most once.
 *
 * The display layer does not cache: it calls `fetchAccount` from three places per instruction plus
 * once per injected input, so one mint can cost six identical round trips. Create one wrapper per
 * computation and let it expire with that computation, rather than sharing a long-lived cache that
 * would go stale against the chain.
 */
export function memoizeFetchAccount(fetchAccount: FetchAccountFn): FetchAccountFn {
    const inFlight = new Map<Address, Promise<MaybeEncodedAccount>>();

    return address => {
        const cached = inFlight.get(address);
        if (cached) return cached;

        // A rejection is evicted so a transient RPC failure does not poison the address.
        const request = fetchAccount(address).catch((error: unknown) => {
            inFlight.delete(address);
            throw error;
        });

        inFlight.set(address, request);
        return request;
    };
}

/** Memoized `fetchAccount` backed by a cluster rpc, for one display computation. */
export function createFetchDisplayAccount(rpc: SolanaRpc): FetchAccountFn {
    return memoizeFetchAccount(address => fetchEncodedAccount(rpc, address));
}
