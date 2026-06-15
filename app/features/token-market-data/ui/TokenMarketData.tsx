import { LoadingCard } from '@components/shared/LoadingCard';

import { cn } from '@/app/components/shared/utils';

import { type TokenMarketDataResult, TokenMarketDataStatus } from '../lib/types';
import { MarketData, type MarketDataProps } from './MarketData';

const DEFAULT_PRICE_DECIMALS = 2;
const SUB_DOLLAR_PRICE_DECIMALS = 6;

export function TokenMarketData({ marketData }: { marketData?: TokenMarketDataResult }) {
    const stats = marketData?.status === TokenMarketDataStatus.Success ? marketData.stats : undefined;
    const priceDecimals = stats && stats.price < 1 ? SUB_DOLLAR_PRICE_DECIMALS : DEFAULT_PRICE_DECIMALS;

    const isLoading = marketData?.status === TokenMarketDataStatus.Loading;

    const tiles: MarketDataProps[] = [];
    if (stats) {
        tiles.push({
            label: 'Price',
            rank: stats.marketCapRank,
            value: {
                precision: priceDecimals,
                price: stats.price,
                trend: stats.priceChange24h,
            },
        });
        if (stats.volume24h !== undefined) {
            tiles.push({ label: '24 Hour Volume', value: { volume: stats.volume24h } });
        }
        if (stats.marketCap !== undefined) {
            tiles.push({
                label: 'Market Cap',
                lastUpdatedAt: stats.lastUpdated,
                value: { volume: stats.marketCap },
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
