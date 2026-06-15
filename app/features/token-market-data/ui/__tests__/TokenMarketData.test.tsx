import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createTokenMarketStats } from '../../__tests__/__fixtures__/market-data';
import { TokenMarketDataStatus } from '../../lib/types';
import { TokenMarketData } from '../TokenMarketData';

describe('TokenMarketData', () => {
    it('should render one tile per available stat on Success', () => {
        render(
            <TokenMarketData marketData={{ stats: createTokenMarketStats(), status: TokenMarketDataStatus.Success }} />,
        );
        expect(screen.getAllByLabelText('market-data')).toHaveLength(3);
    });

    it('should clear stale tiles when the same instance changes from Success to FetchFailed', () => {
        const { rerender } = render(
            <TokenMarketData marketData={{ stats: createTokenMarketStats(), status: TokenMarketDataStatus.Success }} />,
        );
        expect(screen.getAllByLabelText('market-data')).toHaveLength(3);

        rerender(<TokenMarketData marketData={{ status: TokenMarketDataStatus.FetchFailed }} />);
        expect(screen.queryAllByLabelText('market-data')).toHaveLength(0);
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
});
