import { gen } from '@__fixtures__/gen';
import { screen } from '@testing-library/react';
import { displayTimestampAbsolute, unixTimestampToMs } from '@utils/date';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@/app/__tests__/card-harness';

import { BaseTokenTransfersCard, type TokenTransferRowView } from '../BaseTokenTransfersCard';

vi.mock('next/navigation', () => import('@/app/__tests__/next-navigation'));

describe('BaseTokenTransfersCard', () => {
    it('should show the empty state once the full history holds no transfers', () => {
        renderCard({ foundOldest: true, rows: [] });

        expect(screen.getByText('No transfers found')).toBeInTheDocument();
        expect(screen.queryByText('Transaction Signature')).not.toBeInTheDocument();
        expect(screen.queryByText('Fetched full history')).not.toBeInTheDocument();
    });

    it('should show a dash in the Time cell of a row without a block time', () => {
        renderCard({
            rows: [row({ blockTime: BLOCK_TIME, key: 'timed' }), row({ blockTime: undefined, key: 'untimed' })],
        });

        expect(screen.getAllByText('Time')).not.toHaveLength(0);
        expect(screen.getAllByText(BLOCK_TIME_UTC)).toHaveLength(1);
        expect(screen.getByText('---')).toBeInTheDocument();
    });

    it('should leave out the Time column when no row has a block time', () => {
        renderCard({ rows: [row({ blockTime: undefined })] });

        expect(screen.queryByText('Time')).not.toBeInTheDocument();
        expect(screen.queryByText('---')).not.toBeInTheDocument();
    });

    it('should mark a failed transfer with a Failed badge', () => {
        renderCard({ rows: [row({ status: 'failed' })] });

        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.queryByText('Success')).not.toBeInTheDocument();
    });

    it('should show the amount without a symbol while the token info loads', () => {
        renderCard({ rows: [row({ amount: '12.5', units: undefined })] });

        expect(screen.getByText('12.5')).toBeInTheDocument();
        expect(screen.queryByText('USDC')).not.toBeInTheDocument();
        expect(screen.queryByText('Tokens')).not.toBeInTheDocument();
    });
});

const BLOCK_TIME = 1_718_000_000;
const BLOCK_TIME_UTC = displayTimestampAbsolute(unixTimestampToMs(BLOCK_TIME), true);

function renderCard({ rows, foundOldest = false }: { rows: TokenTransferRowView[]; foundOldest?: boolean }) {
    return renderWithProviders(
        <BaseTokenTransfersCard
            rows={rows}
            fetching={false}
            foundOldest={foundOldest}
            onRefresh={() => {}}
            onLoadMore={() => {}}
        />,
        { transactions: false },
    );
}

function row(overrides: Partial<TokenTransferRowView> = {}): TokenTransferRowView {
    return {
        amount: '1.000000',
        blockTime: undefined,
        destination: gen.publicKey(2),
        key: 'row',
        rawAmount: '1.000000',
        scaledUiAmountMultiplier: '1',
        signature: gen.signature(1),
        source: gen.publicKey(1),
        status: 'success',
        units: 'USDC',
        ...overrides,
    };
}
