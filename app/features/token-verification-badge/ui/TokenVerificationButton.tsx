import { cva } from 'class-variance-authority';
import React from 'react';

import { cn } from '@/app/components/shared/utils';

import { EVerificationSource, VerificationSource } from '../lib/types';
import { ERiskLevel, getRiskLevel } from '../model/use-rugcheck';
import { SourceIcon } from './icons/SourceIcon';
import { VerificationIcon } from './VerificationIcon';

const sourceBorderVariants = cva('flex rounded border border-solid p-px opacity-80', {
    variants: {
        tone: {
            [ERiskLevel.Danger]: 'border-red-400',
            [ERiskLevel.Good]: 'border-green-400',
            [ERiskLevel.Warning]: 'border-orange-400',
        },
    },
});

// `row` is a full-width strip below md and a tile from md up; `tile` is the tile on every width, for when
// the button shares a grid with the market data tiles. A tile is 64px tall, like the market data tiles:
// 1px borders, 8px padding, a 20px label line, a 4px gap and a 20px line of icons, spinner or text, with 2px
// spare at the bottom. The gap is 2px under the market tiles' 6px so the icons sit higher: at 6px they were
// 9px from the bottom edge against 13px from the left one, and looked dropped.
const buttonVariants = cva(
    [
        'flex w-full shrink-0 rounded-md border border-solid bg-outer-space-900',
        'md:h-[stretch] md:max-h-fit md:w-[160px]',
    ],
    {
        defaultVariants: {
            isLoading: false,
            isOpen: false,
            layout: 'row',
        },
        variants: {
            isLoading: {
                false: 'cursor-pointer',
                true: 'cursor-not-allowed',
            },
            isOpen: {
                false: 'border-outer-space-800',
                true: 'border-green-400',
            },
            layout: {
                row: 'items-center p-2 md:min-h-16 md:flex-col md:items-start md:px-3 md:py-2',
                tile: 'min-h-16 flex-col items-start px-3 py-2',
            },
        },
    },
);

function getSourceBorderTone(source: VerificationSource): ERiskLevel {
    if (source && source.name === EVerificationSource.RugCheck && source.score !== undefined) {
        return getRiskLevel(source.score);
    }

    return source.verified ? ERiskLevel.Good : ERiskLevel.Danger;
}

const labelRowVariants = cva('flex w-full items-center gap-2', {
    defaultVariants: { layout: 'row' },
    variants: { layout: { row: 'md:mb-1', tile: 'mb-1' } },
});

const spinnerVariants = cva('spinner-grow spinner-grow-sm text-white', {
    defaultVariants: { layout: 'row' },
    variants: { layout: { row: 'md:mb-1', tile: 'mb-1' } },
});

const notVerifiedVariants = cva('font-semibold leading-5 text-heavy-metal-400', {
    defaultVariants: { layout: 'row' },
    variants: { layout: { row: 'md:text-base', tile: 'text-base' } },
});

export type TokenVerificationButtonLayout = 'row' | 'tile';

type TokenVerificationButtonProps = {
    isLoading?: boolean;
    isOpen: boolean;
    layout?: TokenVerificationButtonLayout;
    verificationFoundSources: VerificationSource[];
} & React.ComponentPropsWithoutRef<'button'>;

export const TokenVerificationButton = React.forwardRef<HTMLButtonElement, TokenVerificationButtonProps>(
    ({ isLoading, isOpen, layout, verificationFoundSources, className, ...props }, ref) => {
        const hasVerification = verificationFoundSources.length > 0;

        return (
            <button
                ref={ref}
                type="button"
                className={cn(buttonVariants({ isLoading, isOpen, layout }), className)}
                {...props}
            >
                <div className={labelRowVariants({ layout })}>
                    <p className="m-0 text-sm text-white">Verification</p>

                    <VerificationIcon verificationFoundSources={verificationFoundSources} isLoading={isLoading} />
                </div>

                {isLoading ? (
                    <span className={spinnerVariants({ layout })} />
                ) : (
                    <div className="flex flex-shrink-0 items-center gap-1">
                        {hasVerification ? (
                            verificationFoundSources.map((source, idx) => (
                                <div key={idx} className={sourceBorderVariants({ tone: getSourceBorderTone(source) })}>
                                    <SourceIcon source={source.name} />
                                </div>
                            ))
                        ) : (
                            <span className={notVerifiedVariants({ layout })}>Not verified</span>
                        )}
                    </div>
                )}
            </button>
        );
    },
);

TokenVerificationButton.displayName = 'TokenVerificationButton';
