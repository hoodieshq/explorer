import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { displayTimestampWithoutDate } from '@utils/date';
import { describe, expect, it } from 'vitest';

import { createTokenMarketStats } from '../../__tests__/__fixtures__/market-data';
import { TokenMarketDataStatus } from '../../model/types';
import { fractionDigits } from '../MarketData';
import { TokenMarketData } from '../TokenMarketData';

describe('TokenMarketData', () => {
    it('should render one tile per available stat on Success', () => {
        render(
            <TokenMarketData marketData={{ stats: createTokenMarketStats(), status: TokenMarketDataStatus.Success }} />,
        );
        expect(screen.getAllByRole('button')).toHaveLength(3);
    });

    it('should clear stale tiles when the same instance changes from Success to FetchFailed', () => {
        const { rerender } = render(
            <TokenMarketData marketData={{ stats: createTokenMarketStats(), status: TokenMarketDataStatus.Success }} />,
        );
        expect(screen.getAllByRole('button')).toHaveLength(3);

        rerender(<TokenMarketData marketData={{ status: TokenMarketDataStatus.FetchFailed }} />);
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('should reset price precision when moving from a sub-$1 token to a >=$1 token', () => {
        const { rerender } = render(
            <TokenMarketData
                marketData={{ stats: createTokenMarketStats({ price: 0.5 }), status: TokenMarketDataStatus.Success }}
            />,
        );
        expect(screen.getByText('$0.500000')).toBeInTheDocument(); // sub-$1 → 6 decimals

        rerender(
            <TokenMarketData
                marketData={{ stats: createTokenMarketStats({ price: 5 }), status: TokenMarketDataStatus.Success }}
            />,
        );
        expect(screen.getByText('$5.00')).toBeInTheDocument();
        expect(screen.queryByText('$5.000000')).not.toBeInTheDocument();
    });

    it('should render the volume and market-cap tiles with abbreviated dollar amounts', () => {
        render(
            <TokenMarketData marketData={{ stats: createTokenMarketStats(), status: TokenMarketDataStatus.Success }} />,
        );
        expect(screen.getByText('24 Hour Volume')).toBeInTheDocument();
        expect(screen.getByText('$500K')).toBeInTheDocument(); // abbreviatedNumber(500_000)
        expect(screen.getByText('Market Cap')).toBeInTheDocument();
        expect(screen.getByText('$1M')).toBeInTheDocument(); // abbreviatedNumber(1_000_000)
    });

    it('should render the market-cap rank badge on the price tile', () => {
        render(
            <TokenMarketData marketData={{ stats: createTokenMarketStats(), status: TokenMarketDataStatus.Success }} />,
        );
        expect(screen.getByText('Rank #5')).toBeInTheDocument();
    });

    it('should omit the rank badge when there is no rank', () => {
        render(
            <TokenMarketData
                marketData={{
                    stats: createTokenMarketStats({ marketCapRank: undefined }),
                    status: TokenMarketDataStatus.Success,
                }}
            />,
        );
        expect(screen.queryByText('Rank #1')).not.toBeInTheDocument();
    });

    it('should render an up trend for a positive 24h change', () => {
        render(
            <TokenMarketData
                marketData={{
                    stats: createTokenMarketStats({ priceChange24h: 0.67 }),
                    status: TokenMarketDataStatus.Success,
                }}
            />,
        );
        expect(screen.getByText('0.67%')).toBeInTheDocument();
    });

    it('should render a down trend for a negative 24h change', () => {
        render(
            <TokenMarketData
                marketData={{
                    stats: createTokenMarketStats({ priceChange24h: -3.5 }),
                    status: TokenMarketDataStatus.Success,
                }}
            />,
        );
        expect(screen.getByText('-3.50%')).toBeInTheDocument();
    });

    it('should open a popover with the exact price and the update time', async () => {
        const lastUpdated = new Date('2025-01-01T00:00:00Z');
        const stats = createTokenMarketStats({ lastUpdated, price: 0.999497 });
        render(<TokenMarketData marketData={{ stats, status: TokenMarketDataStatus.Success }} />);

        await userEvent.hover(screen.getByRole('button', { name: name => name.startsWith('Price') }));

        // The tile rounds to the same six places, so the popover adds a second copy.
        expect(await screen.findAllByText('$0.999497')).toHaveLength(2);
        expect(
            screen.getByText(`Updated at ${displayTimestampWithoutDate(lastUpdated.getTime())}`),
        ).toBeInTheDocument();
    });

    it('should show the unabbreviated amount in the volume popover', async () => {
        render(
            <TokenMarketData marketData={{ stats: createTokenMarketStats(), status: TokenMarketDataStatus.Success }} />,
        );

        await userEvent.hover(screen.getByRole('button', { name: name => name.startsWith('24 Hour Volume') }));

        expect(await screen.findByText('$500,000.00')).toBeInTheDocument();
    });
});

describe('fractionDigits', () => {
    it.each([
        [5, 0],
        [1.23, 2],
        [0.999497, 6],
        [1e-7, 7],
        [1.5e-7, 8],
    ])('should count %s as %s decimal places', (amount, digits) => {
        expect(fractionDigits(amount)).toBe(digits);
    });
});
