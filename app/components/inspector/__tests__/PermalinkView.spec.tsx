import { FetchStatus } from '@providers/cache';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PermalinkView } from '../InspectorPage';

const fetchTransaction = vi.fn();
let cacheEntry: ReturnType<typeof makeEntry> | undefined;

vi.mock('@providers/transactions/raw', () => ({
    useFetchRawTransaction: () => fetchTransaction,
    useRawTransactionDetails: () => cacheEntry,
}));
vi.mock('@utils/use-tab-visibility', () => ({ default: () => ({ visible: true }) }));
// PermalinkView derives its inspector path via useClusterPath (@utils/url), which reads
// useSearchParams; provide both nav hooks it touches.
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => new URLSearchParams(),
}));

// Minimal stand-in for a decoded raw tx; only the fields PermalinkView reads.
function makeEntry(raw: unknown, status = FetchStatus.Fetched) {
    return { data: { raw }, status };
}

beforeEach(() => {
    vi.useFakeTimers();
    fetchTransaction.mockReset();
    cacheEntry = undefined;
});
afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
});

const props = { reset: () => {}, showTokenBalanceChanges: false, signature: 'sig' };
const renderView = () => render(<PermalinkView {...props} />);

describe('PermalinkView', () => {
    it('should fetch at confirmed commitment on mount', () => {
        renderView();
        expect(fetchTransaction).toHaveBeenCalledWith('sig', 'confirmed');
    });

    it('should show the waiting preloader while raw is null', () => {
        cacheEntry = makeEntry(null);
        renderView();
        expect(screen.getByText('Waiting for transaction to be confirmed...')).toBeInTheDocument();
    });

    it('should show "Transaction was not found" after NOT_FOUND_BAILOUT empty retries', () => {
        cacheEntry = makeEntry(null);
        const { rerender } = renderView();
        for (let i = 0; i < 5; i++) {
            act(() => vi.advanceTimersByTime(2000));
            rerender(<PermalinkView {...props} />);
        }
        expect(screen.getByText('Transaction was not found')).toBeInTheDocument();
    });

    it('should show "Failed to fetch transaction" on FetchFailed', () => {
        cacheEntry = makeEntry(undefined, FetchStatus.FetchFailed);
        renderView();
        expect(screen.getByText('Failed to fetch transaction')).toBeInTheDocument();
    });
});
