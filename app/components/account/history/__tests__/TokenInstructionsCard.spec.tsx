import type { AccountHistory } from '@features/transaction-history';
import { type CacheEntry, FetchStatus } from '@providers/cache';
import { address } from '@solana/kit';
import { fireEvent, render, screen } from '@testing-library/react';
import { displayTimestampAbsolute } from '@utils/date';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BaseTokenInstructionsCard, type TokenInstructionRowView } from '../BaseTokenInstructionsCard';
import { TokenInstructionsCard } from '../TokenInstructionsCard';

const mock = vi.hoisted(() => ({ entry: undefined as CacheEntry<AccountHistory> | undefined }));

vi.mock('@providers/accounts', () => ({ useAccountHistory: () => mock.entry }));
vi.mock('@features/transaction-history/model/use-fetch-account-history', () => ({
    useFetchAccountHistory: () => vi.fn(),
}));
vi.mock('@components/common/Address', () => ({
    Address: ({ address }: { address: string }) => <span>{address}</span>,
}));
vi.mock('@components/common/Signature', () => ({
    Signature: ({ signature }: { signature: string }) => <span>{signature}</span>,
}));

describe('TokenInstructionsCard', () => {
    beforeEach(() => {
        mock.entry = { data: HISTORY, status: FetchStatus.Fetched };
    });

    it('should show the checkmark after a refresh succeeds', () => {
        const { rerender } = render(<TokenInstructionsCard address={ADDRESS} />);

        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
        mock.entry = { data: HISTORY, status: FetchStatus.Fetching };
        rerender(<TokenInstructionsCard address={ADDRESS} />);
        mock.entry = { data: HISTORY, status: FetchStatus.Fetched };
        rerender(<TokenInstructionsCard address={ADDRESS} />);

        expect(screen.getByText('Refreshed')).toBeInTheDocument();
    });

    it('should keep the refresh button usable after a refresh fails', () => {
        const { rerender } = render(<TokenInstructionsCard address={ADDRESS} />);

        fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
        mock.entry = { data: HISTORY, status: FetchStatus.Fetching };
        rerender(<TokenInstructionsCard address={ADDRESS} />);
        mock.entry = { data: HISTORY, status: FetchStatus.FetchFailed };
        rerender(<TokenInstructionsCard address={ADDRESS} />);

        expect(screen.getByRole('button', { name: 'Refresh' })).toBeEnabled();
        expect(screen.queryByText('Refreshed')).not.toBeInTheDocument();
    });
});

describe('BaseTokenInstructionsCard', () => {
    it('should show the empty state once the full history has no instructions', () => {
        render(card({ foundOldest: true, rows: [] }));

        expect(screen.getByText('No instructions found')).toBeInTheDocument();
        expect(screen.queryByText('Transaction Signature')).not.toBeInTheDocument();
        expect(screen.queryByText('Fetched full history')).not.toBeInTheDocument();
    });

    it('should offer Load More while older history may still hold instructions', () => {
        render(card({ foundOldest: false, rows: [] }));

        expect(screen.queryByText('No instructions found')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Load More' })).toBeInTheDocument();
    });

    it('should leave out the Time column when no row has a block time', () => {
        render(card({ rows: [row({ blockTime: null })] }));

        expect(screen.getByText('Transfer')).toBeInTheDocument();
        expect(screen.queryByText('Time')).not.toBeInTheDocument();
        expect(screen.queryByText('---')).not.toBeInTheDocument();
    });

    it('should show a dash in the Time cell of a row without a block time', () => {
        render(
            card({
                rows: [row({ blockTime: BLOCK_TIME, key: 'timed' }), row({ blockTime: undefined, key: 'untimed' })],
            }),
        );

        expect(screen.getAllByText('Time')).not.toHaveLength(0);
        expect(screen.getAllByText(BLOCK_TIME_UTC)).toHaveLength(1);
        expect(screen.getByText('---')).toBeInTheDocument();
    });

    it('should mark a failed transaction with a Failed badge', () => {
        render(card({ rows: [row({ status: 'failed' })] }));

        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });
});

const ADDRESS = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SIGNATURE = '5YtADoExampleTokenInstructionSignaturePlaceholderForTestsLJatMabcdefghijk';
const BLOCK_TIME = 1_718_000_000;
// Timestamp shows UTC unless the viewer pinned another format, and nothing is pinned in tests.
const BLOCK_TIME_UTC = displayTimestampAbsolute(BLOCK_TIME * 1000, true);

const HISTORY: AccountHistory = { fetched: [], foundOldest: true, transactionMap: new Map() };

function row(overrides: Partial<TokenInstructionRowView> = {}): TokenInstructionRowView {
    return {
        blockTime: BLOCK_TIME,
        instructionName: 'Transfer',
        key: 'row',
        programId: address('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        signature: SIGNATURE,
        status: 'success',
        ...overrides,
    };
}

function card({ rows, foundOldest = false }: { rows: TokenInstructionRowView[]; foundOldest?: boolean }) {
    return (
        <BaseTokenInstructionsCard
            rows={rows}
            fetching={false}
            foundOldest={foundOldest}
            onRefresh={() => {}}
            onLoadMore={() => {}}
        />
    );
}
