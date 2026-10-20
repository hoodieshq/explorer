import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { useAddressLookupTables } from '@/app/providers/accounts';
import { FetchStatus } from '@/app/providers/cache';

import { useDecodedMessage } from '../use-decoded-message';
import { buildMessage, INNER_INSTRUCTIONS } from './__fixtures__/create-idempotent-tx';
import { buildLookupMessage } from './__fixtures__/lookup-message';

vi.mock('@/app/providers/accounts', async importOriginal => ({
    ...(await importOriginal<typeof import('@/app/providers/accounts')>()),
    useAddressLookupTables: vi.fn(() => []),
}));

beforeEach(() => {
    vi.mocked(useAddressLookupTables).mockReturnValue([]);
});

describe('useDecodedMessage', () => {
    test('should report loading while a lookup table is fetching', () => {
        vi.mocked(useAddressLookupTables).mockReturnValue([undefined]);

        const { result } = renderHook(() => useDecodedMessage(buildLookupMessage()));

        expect(result.current).toEqual({ status: 'loading' });
    });

    test('should report failed with the index of the table that failed', () => {
        vi.mocked(useAddressLookupTables).mockReturnValue([[undefined, FetchStatus.FetchFailed]]);

        const { result } = renderHook(() => useDecodedMessage(buildLookupMessage()));

        expect(result.current).toEqual({ failedLookupIndex: 0, status: 'failed' });
    });

    test('should report failed when a lookup table is not found', () => {
        vi.mocked(useAddressLookupTables).mockReturnValue([['Lookup Table Not Found', FetchStatus.Fetched]]);

        const { result } = renderHook(() => useDecodedMessage(buildLookupMessage()));

        expect(result.current).toEqual({ failedLookupIndex: 0, status: 'failed' });
    });

    test('should report failed when a lookup table fetch settles without data', () => {
        vi.mocked(useAddressLookupTables).mockReturnValue([[undefined, FetchStatus.Fetched]]);

        const { result } = renderHook(() => useDecodedMessage(buildLookupMessage()));

        expect(result.current).toEqual({ failedLookupIndex: 0, status: 'failed' });
    });

    test('should keep loading while a lookup table is fetching with no data yet', () => {
        vi.mocked(useAddressLookupTables).mockReturnValue([[undefined, FetchStatus.Fetching]]);

        const { result } = renderHook(() => useDecodedMessage(buildLookupMessage()));

        expect(result.current).toEqual({ status: 'loading' });
    });

    test('should decode at once when the message has no lookups', () => {
        const message = buildMessage();

        const { result } = renderHook(() => useDecodedMessage(message));

        expect(result.current.status).toBe('ready');
        if (result.current.status !== 'ready') return;
        expect(result.current.decoded.kitInstructions).toHaveLength(message.compiledInstructions.length);
    });

    test('should resolve inner instructions when they are given', () => {
        const message = buildMessage();

        const { result } = renderHook(() => useDecodedMessage(message, INNER_INSTRUCTIONS));

        expect(result.current.status).toBe('ready');
        if (result.current.status !== 'ready') return;
        expect(result.current.decoded.kitInnerIxByIndex.get(0)).toHaveLength(INNER_INSTRUCTIONS[0].instructions.length);
    });

    test('should keep the decoded result across re-renders', () => {
        const message = buildMessage();

        const { result, rerender } = renderHook(() => useDecodedMessage(message, INNER_INSTRUCTIONS));
        const first = result.current;
        rerender();

        expect(result.current).toBe(first);
    });
});
