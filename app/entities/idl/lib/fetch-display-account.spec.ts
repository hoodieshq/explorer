import { gen } from '@__fixtures__/gen';
import { type Address, address, type MaybeEncodedAccount } from '@solana/kit';
import { describe, expect, it, vi } from 'vitest';

import { memoizeFetchAccount } from './fetch-display-account';

const ADDRESS = address(gen.address(1));
const OTHER_ADDRESS = address(gen.address(2));

function createFetchAccount() {
    return vi.fn(async (queried: Address): Promise<MaybeEncodedAccount> => ({ address: queried, exists: false }));
}

describe('memoizeFetchAccount', () => {
    it('should pass the requested account through', async () => {
        const fetchAccount = memoizeFetchAccount(createFetchAccount());

        await expect(fetchAccount(ADDRESS)).resolves.toEqual({ address: ADDRESS, exists: false });
    });

    it('should issue one request for repeated lookups of the same address', async () => {
        const inner = createFetchAccount();
        const fetchAccount = memoizeFetchAccount(inner);

        for (let i = 0; i < 6; i++) await fetchAccount(ADDRESS);

        expect(inner).toHaveBeenCalledTimes(1);
    });

    it('should de-duplicate concurrent lookups before the first resolves', async () => {
        const inner = createFetchAccount();
        const fetchAccount = memoizeFetchAccount(inner);

        const [first, second] = await Promise.all([fetchAccount(ADDRESS), fetchAccount(ADDRESS)]);

        expect(inner).toHaveBeenCalledTimes(1);
        expect(first).toEqual(second);
    });

    it('should keep distinct addresses separate', async () => {
        const inner = createFetchAccount();
        const fetchAccount = memoizeFetchAccount(inner);

        await fetchAccount(ADDRESS);
        await fetchAccount(OTHER_ADDRESS);

        expect(inner).toHaveBeenCalledTimes(2);
    });

    it('should not cache a rejection, so a later lookup can retry', async () => {
        const inner = vi
            .fn<(queried: Address) => Promise<MaybeEncodedAccount>>()
            .mockRejectedValueOnce(new Error('rpc down'))
            .mockResolvedValueOnce({ address: ADDRESS, exists: false });
        const fetchAccount = memoizeFetchAccount(inner);

        await expect(fetchAccount(ADDRESS)).rejects.toThrow('rpc down');
        await expect(fetchAccount(ADDRESS)).resolves.toEqual({ address: ADDRESS, exists: false });
        expect(inner).toHaveBeenCalledTimes(2);
    });
});
