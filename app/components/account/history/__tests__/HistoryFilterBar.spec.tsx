/* eslint-disable no-restricted-syntax -- test assertions use RegExp for pattern matching */
import { fireEvent, render, renderHook, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Cluster } from '@/app/utils/cluster';

const replaceMock = vi.fn();
let mockSearchString = '';

let mockCluster = { cluster: Cluster.MainnetBeta, name: 'Mainnet Beta' };

vi.mock('@entities/cluster', async importOriginal => {
    const actual = await importOriginal<typeof import('@entities/cluster')>();
    return { ...actual, useCluster: () => mockCluster };
});

vi.mock('next/navigation', () => ({
    usePathname: () => '/address/testAddress',
    useRouter: () => ({ replace: replaceMock }),
    useSearchParams: () => new URLSearchParams(mockSearchString),
}));

// Must import after mocks
import { MethodSupportContext } from '@features/transaction-history/model/history-provider';

import { HistoryFilterBar, useHistoryFilters } from '../HistoryFilterBar';

function setSearch(search: string) {
    mockSearchString = search;
}

beforeEach(() => {
    replaceMock.mockClear();
    setSearch('');
    mockCluster = { cluster: Cluster.MainnetBeta, name: 'Mainnet Beta' };
});

describe('useHistoryFilters', () => {
    it('should return all-undefined when no params are set', () => {
        setSearch('');
        const { result } = renderHook(() => useHistoryFilters());
        expect(result.current).toEqual({
            blockTime: undefined,
            slot: undefined,
            status: undefined,
        });
    });

    it('should parse both slot bounds from the gTFA filter paths', () => {
        setSearch('slot.gte=100&slot.lte=200');
        const { result } = renderHook(() => useHistoryFilters());
        expect(result.current.slot).toEqual({ gte: 100, lte: 200 });
    });

    it('should ignore negative and non-numeric values', () => {
        setSearch('slot.gte=-5&slot.lte=abc');
        const { result } = renderHook(() => useHistoryFilters());
        expect(result.current.slot).toBeUndefined();
    });

    it('should floor fractional values', () => {
        setSearch('slot.gte=100.9');
        const { result } = renderHook(() => useHistoryFilters());
        expect(result.current.slot).toEqual({ gte: 100, lte: undefined });
    });

    it('should parse the status enum, rejecting unknown values', () => {
        setSearch('status=failed');
        const { result } = renderHook(() => useHistoryFilters());
        expect(result.current).toMatchObject({ status: 'failed' });

        setSearch('status=bogus');
        const { result: rejected } = renderHook(() => useHistoryFilters());
        expect(rejected.current).toMatchObject({ status: undefined });
    });

    it('should parse block-time bounds from the gTFA filter paths', () => {
        setSearch('blockTime.gte=1700000000&blockTime.lte=1700100000');
        const { result } = renderHook(() => useHistoryFilters());
        expect(result.current.blockTime).toEqual({ gte: 1_700_000_000, lte: 1_700_100_000 });
    });
});

describe('HistoryFilterBar', () => {
    it('should show a single Filters button when no filter is active', () => {
        render(<HistoryFilterBar />);
        expect(screen.getByRole('button', { name: /^Filters$/ })).toBeInTheDocument();
        expect(screen.queryByText(/Slot ≥:/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Slot ≤:/)).not.toBeInTheDocument();
    });

    it('should explain on click that filtering is paused for an address where gTFA is disabled', () => {
        // Wrapped SOL — in GTFA_DISABLED_ADDRESSES, so filtering falls back to
        // getSignaturesForAddress and the UI must present filters as unavailable.
        render(<HistoryFilterBar address="So11111111111111111111111111111111111111112" />);

        fireEvent.click(screen.getByRole('button', { name: /Filters unavailable/ }));

        expect(screen.getByText(/temporarily off for this account/)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /Change RPC endpoint/ })).not.toBeInTheDocument();
    });

    it('should explain on click that the endpoint lacks gTFA and offer to change it', () => {
        renderWithoutGtfa();

        fireEvent.click(screen.getByRole('button', { name: /Filters unavailable/ }));

        expect(screen.getByText(/Filters need an RPC endpoint that supports/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Change RPC endpoint/ })).toBeInTheDocument();
    });

    it('should point a public devnet user to a custom devnet endpoint', () => {
        mockCluster = { cluster: Cluster.Devnet, name: 'Devnet' };
        renderWithoutGtfa();

        fireEvent.click(screen.getByRole('button', { name: /Filters unavailable/ }));

        expect(screen.getByText(/The public Devnet endpoint doesn.t support/)).toBeInTheDocument();
        expect(screen.getByText(/connect a custom Devnet RPC endpoint/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Use a custom RPC endpoint/ })).toBeInTheDocument();
    });

    it('should keep the filter control enabled for a non-blocked address', () => {
        render(<HistoryFilterBar address="4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T" />);

        expect(screen.getByRole('button', { name: /^Filters$/ })).toBeEnabled();
    });

    it('should render a chip per active slot bound', () => {
        render(<HistoryFilterBar slot={{ gte: 100, lte: 2_000_000 }} />);
        expect(screen.getByText(/Slot ≥:\s*100/)).toBeInTheDocument();
        // Use a regex since jsdom's toLocaleString thousand separator varies by ICU build.
        expect(screen.getByText(/Slot ≤:\s*2[,.\s  ]?000[,.\s  ]?000/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Edit filters/ })).toBeInTheDocument();
    });

    it('should clear a single slot bound when its chip × is clicked', () => {
        setSearch('slot.gte=100&slot.lte=200');
        render(<HistoryFilterBar slot={{ gte: 100, lte: 200 }} />);

        fireEvent.click(screen.getByRole('button', { name: /Clear slot ≥ filter/ }));

        expect(replaceMock).toHaveBeenCalledTimes(1);
        const [href] = replaceMock.mock.calls[0];
        expect(href).toBe('/address/testAddress?slot.lte=200');
    });

    it('should apply each slot bound as its field is committed', () => {
        render(<HistoryFilterBar />);

        fireEvent.click(screen.getByRole('button', { name: /^Filters$/ }));
        const lower = screen.getByPlaceholderText(/lower bound/i);
        fireEvent.change(lower, { target: { value: '100' } });
        fireEvent.blur(lower);
        const upper = screen.getByPlaceholderText(/upper bound/i);
        fireEvent.change(upper, { target: { value: '500' } });
        fireEvent.keyDown(upper, { key: 'Enter' });

        expect(replaceMock).toHaveBeenCalledTimes(2);
        expect(replaceMock.mock.calls[0][0]).toBe('/address/testAddress?slot.gte=100');
        const [href] = replaceMock.mock.calls[1];
        expect(href).toMatch(/slot\.gte=100/);
        expect(href).toMatch(/slot\.lte=500/);
    });

    it('should preserve unrelated query params when updating the URL', () => {
        setSearch('cluster=devnet&slot.gte=100');
        render(<HistoryFilterBar slot={{ gte: 100 }} />);

        fireEvent.click(screen.getByRole('button', { name: /Clear slot ≥ filter/ }));

        const [href] = replaceMock.mock.calls[0];
        expect(href).toBe('/address/testAddress?cluster=devnet');
    });

    it('should not apply an inverted slot range and should say why', () => {
        render(<HistoryFilterBar />);

        fireEvent.click(screen.getByRole('button', { name: /^Filters$/ }));
        fireEvent.change(screen.getByPlaceholderText(/lower bound/i), { target: { value: '500' } });
        const upper = screen.getByPlaceholderText(/upper bound/i);
        fireEvent.change(upper, { target: { value: '100' } });
        fireEvent.blur(upper);

        expect(screen.getByText(/lower bound must not exceed the upper bound/)).toBeInTheDocument();
        expect(replaceMock).not.toHaveBeenCalled();
    });

    it('should apply a status chip at once', () => {
        render(<HistoryFilterBar />);

        fireEvent.click(screen.getByRole('button', { name: /^Filters$/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Succeeded' }));

        const [href] = replaceMock.mock.calls[0];
        expect(href).toBe('/address/testAddress?status=succeeded');
    });

    it('should keep both status chips picked in the URL while filtering by neither', () => {
        setSearch('status=succeeded');
        render(<HistoryFilterBar status="succeeded" />);

        fireEvent.click(screen.getByRole('button', { name: /Edit filters/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Failed' }));

        const [href] = replaceMock.mock.calls[0];
        expect(new URLSearchParams(href.split('?')[1]).get('status')).toBe('succeeded,failed');
        setSearch('status=succeeded,failed');
        const { result } = renderHook(() => useHistoryFilters());
        expect(result.current.status).toBeUndefined();
    });

    it('should clear one section via its Reset', () => {
        setSearch('slot.gte=100&slot.lte=500&status=failed');
        render(<HistoryFilterBar slot={{ gte: 100, lte: 500 }} status="failed" />);

        fireEvent.click(screen.getByRole('button', { name: /Edit filters/ }));
        const slotSection = screen.getByRole('region', { name: 'Slot' });
        fireEvent.click(within(slotSection).getByRole('button', { name: 'Clear slot filter' }));

        const [href] = replaceMock.mock.calls[0];
        expect(href).toBe('/address/testAddress?status=failed');
    });

    it('should render a chip for the status filter', () => {
        render(<HistoryFilterBar status="failed" />);
        expect(screen.getByText(/Status:\s*Failed/)).toBeInTheDocument();
    });

    it('should clear a single non-slot filter via its chip', () => {
        setSearch('status=failed&slot.lte=200');
        render(<HistoryFilterBar slot={{ lte: 200 }} status="failed" />);

        fireEvent.click(screen.getByRole('button', { name: /Clear status filter/ }));

        const [href] = replaceMock.mock.calls[0];
        expect(href).toBe('/address/testAddress?slot.lte=200');
    });

    it('should clear all filters via Reset all', () => {
        setSearch('slot.gte=100&slot.lte=500');
        render(<HistoryFilterBar slot={{ gte: 100, lte: 500 }} />);

        fireEvent.click(screen.getByRole('button', { name: /Edit filters/ }));
        fireEvent.click(screen.getByRole('button', { name: 'Clear all filters' }));

        const [href] = replaceMock.mock.calls[0];
        expect(href).toBe('/address/testAddress');
    });
});

function renderWithoutGtfa() {
    return render(
        <MethodSupportContext.Provider value={{ markUnsupported: vi.fn(), supported: false }}>
            <HistoryFilterBar address="4Nd1mBQtrMJVYVfKf2PJy9NZUZdTAsp7D4xWLs4gDB4T" />
        </MethodSupportContext.Provider>,
    );
}
