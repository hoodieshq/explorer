import { LoadingCard } from '@components/shared/LoadingCard';
import { useRef } from 'react';

import { cn } from '@/app/components/shared/utils';

import { type TokenMarketDataResult, TokenMarketDataStatus, type TokenMarketStats } from '../lib/types';
import { MarketData, type MarketDataProps } from './MarketData';

export function TokenMarketData({ marketData }: { marketData?: TokenMarketDataResult }) {
    const stats = useRef<TokenMarketStats | undefined>(undefined);
    const priceDecimals = useRef<number>(2);

    if (marketData?.status === TokenMarketDataStatus.Success) {
        stats.current = marketData.stats;
        if (stats.current && stats.current.price < 1) {
            priceDecimals.current = 6;
        }
    }

    const isLoading = marketData?.status === TokenMarketDataStatus.Loading;

    const tiles: MarketDataProps[] = [];
    if (stats.current) {
        tiles.push({
            label: 'Price',
            rank: stats.current.marketCapRank,
            value: {
                precision: priceDecimals.current,
                price: stats.current.price,
                trend: stats.current.priceChange24h,
            },
        });
        if (stats.current.volume24h !== undefined) {
            tiles.push({ label: '24 Hour Volume', value: { volume: stats.current.volume24h } });
        }
        if (stats.current.marketCap !== undefined) {
            tiles.push({
                label: 'Market Cap',
                lastUpdatedAt: stats.current.lastUpdated,
                value: { volume: stats.current.marketCap },
            });
        }
    }

    return (
        <>
            {isLoading && (
                <LoadingCard
                    className={cn(
                        'e-m-0 e-grid e-w-full e-place-items-center e-rounded e-border e-border-solid e-border-black e-bg-[#1C2120] e-px-2 e-py-1 e-text-sm',
                        'md:e-min-h-[69px]',
                    )}
                    message="Loading token price data"
                />
            )}
            {!isLoading && tiles.length > 0 && <MarketData.Series data={tiles} />}
        </>
    );
}
