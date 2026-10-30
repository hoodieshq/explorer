import { useHoverPopover } from '@components/shared/hooks';
import { Popover, PopoverContent, PopoverTrigger } from '@components/shared/ui/popover';
import { displayTimestampWithoutDate } from '@utils/date';
import { cva } from 'class-variance-authority';

import { abbreviatedNumber } from '@/app/utils';

const tileVariants = cva(
    'w-full cursor-pointer rounded-md border border-solid bg-outer-space-900 px-3 py-2 text-left text-sm text-inherit md:w-auto md:min-w-[160px]',
    {
        defaultVariants: { isOpen: false },
        variants: {
            isOpen: {
                false: 'border-outer-space-800',
                true: 'border-green-400',
            },
        },
    },
);

// A 16px line for the 14px change: with the price's 20px line, baseline alignment would push the row to 21px.
const changeVariants = cva('text-sm leading-4', {
    defaultVariants: {
        trend: 'neutral',
    },
    variants: {
        trend: {
            down: 'text-[#F958FC]',
            neutral: 'text-gray-400',
            up: 'text-green-500',
        },
    },
});

export type MarketDataProps = {
    label: string;
    lastUpdatedAt?: Date;
    rank?: number;
    value: { price: number; trend?: number; precision: number } | { volume: number };
};

// A tile opens a popover with the exact amount and the update time, on hover as the Verification tile does
// and on tap. The tile shows a rounded amount, and one update time covers all the tiles.
export function MarketData({ label, lastUpdatedAt, value, rank }: MarketDataProps) {
    const { hoverHandlers, isOpen, setIsOpen } = useHoverPopover();
    const exact = 'volume' in value ? formatUsd(value.volume) : formatUsd(value.price, fractionDigits(value.price));

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild {...hoverHandlers}>
                <button type="button" className={tileVariants({ isOpen })}>
                    <div className="mb-1.5 flex items-center gap-2">
                        <span title={label} className="overflow-hidden text-ellipsis whitespace-nowrap">
                            {label}
                        </span>
                        {(rank ?? 0) > 0 && (
                            <span className="whitespace-nowrap rounded bg-accent-600 px-[5px] text-xs text-outer-space-900">
                                Rank #{rank}
                            </span>
                        )}
                    </div>
                    {/* From md up the tile grows to fit the price and its change; in a narrow grid cell the change wraps
                        under the price instead of being cut off. */}
                    <div className="flex flex-wrap items-baseline gap-x-1 overflow-hidden text-base font-medium leading-5">
                        {'volume' in value ? (
                            <span>${abbreviatedNumber(value.volume)}</span>
                        ) : (
                            <>
                                <span>${value.price.toFixed(value.precision)}</span>
                                <PriceChange change={value.trend} />
                            </>
                        )}
                    </div>
                </button>
            </PopoverTrigger>
            <PopoverContent align="start" collisionPadding={8} side="bottom" className="p-4" {...hoverHandlers}>
                <p className="m-0 text-base text-white">{exact}</p>
                {lastUpdatedAt && (
                    <p className="m-0 mt-1 text-xs text-outer-space-300">
                        Updated at {displayTimestampWithoutDate(lastUpdatedAt.getTime())}
                    </p>
                )}
            </PopoverContent>
        </Popover>
    );
}

function PriceChange({ change }: { change?: number }) {
    const trend = getDynamicTrend(change);

    return (
        <span className={changeVariants({ trend })}>
            {trend !== 'neutral' && <TrendArrow direction={trend} />}
            {trend === 'neutral' ? '0%' : `${change?.toFixed(2)}%`}
        </span>
    );
}

// A steep arrow with a small head, drawn here rather than taken from react-feather: feather's diagonal arrows
// point at 45° with a large head and read as "right" as much as "up". The arrow is inline and sits on the
// text baseline like a glyph, its height close to the digits' cap height.
// Shaft at about 70° from the horizontal; the head's arms are 3 units long, 35° off the shaft.
const UP_ARROW = 'M1.5 9.4L4.5 0.8M2.06 2.55L4.5 0.8L5.32 3.69';
const DOWN_ARROW = 'M1.5 0.6L4.5 9.2M2.06 7.45L4.5 9.2L5.32 6.31';

function TrendArrow({ direction }: { direction: 'up' | 'down' }) {
    return (
        <svg
            aria-hidden
            width="6"
            height="10"
            viewBox="0 0 6 10"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-0.5 inline align-baseline"
        >
            <path d={direction === 'up' ? UP_ARROW : DOWN_ARROW} />
        </svg>
    );
}

function formatUsd(amount: number, fractionDigits = 2) {
    // Never fewer than the cents USD formatting starts from: a lower maximum throws a RangeError.
    const maximumFractionDigits = Math.min(20, Math.max(2, fractionDigits));
    return Intl.NumberFormat('en-US', { currency: 'USD', maximumFractionDigits, style: 'currency' }).format(amount);
}

// Decimal places in the number's shortest form, so a price prints as received: 0.999497 stays 0.999497 instead
// of being rounded to cents or padded with float noise.
export function fractionDigits(amount: number) {
    const [mantissa, exponent = '0'] = amount.toString().split('e');
    const fraction = mantissa.split('.')[1]?.length ?? 0;
    return Math.max(0, fraction - Number(exponent));
}

function getDynamicTrend(dynamic?: number) {
    if (dynamic === undefined) return 'neutral';
    if (dynamic > 0) return 'up';
    else if (dynamic < 0) return 'down';
    else return 'neutral';
}

// Below md the series has no box of its own: the tiles join the page header's two-column grid next to the
// Verification tile. From md up they sit in a row.
MarketData.Series = function MarketDataSeries({ data }: { data: MarketDataProps[] }) {
    return (
        <div className="contents md:flex md:flex-row md:gap-2">
            {data.map((props, index) => (
                <MarketData key={`market-data-${index}`} {...props} />
            ))}
        </div>
    );
};
