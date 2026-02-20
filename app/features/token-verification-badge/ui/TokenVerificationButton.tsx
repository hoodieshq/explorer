import { cva } from 'class-variance-authority';
import React from 'react';

import { cn } from '@/app/components/shared/utils';

import { EVerificationSource, VerificationSource } from '../lib/types';
import { ERiskLevel, RISK_MAX_LEVEL_GOOD, RISK_MAX_LEVEL_WARNING } from '../model/use-rugcheck';
import { VerificationIcon } from './VerificationIcon';

const sourceBorderVariants = cva('e-flex e-rounded e-border e-border-solid e-p-px e-opacity-80', {
    variants: {
        tone: {
            [ERiskLevel.Danger]: 'e-border-red-400',
            [ERiskLevel.Good]: 'e-border-green-400',
            [ERiskLevel.Warning]: 'e-border-orange-400',
        },
    },
});

function getSourceBorderTone(source: VerificationSource): ERiskLevel {
    if (source && source.name === EVerificationSource.RugCheck && source.score !== undefined) {
        if (source.score <= RISK_MAX_LEVEL_GOOD) return ERiskLevel.Good;
        if (source.score <= RISK_MAX_LEVEL_WARNING) return ERiskLevel.Warning;
        return ERiskLevel.Danger;
    }

    return source.verified ? ERiskLevel.Good : ERiskLevel.Danger;
}

type TokenVerificationButtonProps = {
    isLoading?: boolean;
    isOpen: boolean;
    verifiedSources: VerificationSource[];
    verificationFoundSources: VerificationSource[];
} & React.ComponentPropsWithoutRef<'button'>;

export const TokenVerificationButton = React.forwardRef<HTMLButtonElement, TokenVerificationButtonProps>(
    ({ isLoading, isOpen, verifiedSources, verificationFoundSources, className, ...props }, ref) => {
        const hasVerification = verifiedSources.length > 0;

        return (
            <button
                ref={ref}
                type="button"
                className={cn(
                    'e-flex e-w-full e-items-center e-rounded e-border e-border-solid e-bg-[#1C2120] e-p-2',
                    'md:e-h-[stretch] md:e-min-h-[69px] md:e-w-[160px] md:e-flex-col md:e-items-start md:e-px-3 md:e-py-2',
                    isOpen ? 'e-border-green-400' : 'e-border-black',
                    isLoading ? 'e-cursor-not-allowed' : 'e-cursor-pointer',
                    className
                )}
                {...props}
            >
                <div className="e-flex e-w-full e-items-center e-gap-2 md:e-mb-2">
                    <p className="e-m-0 e-text-sm e-text-white">Verification</p>

                    <VerificationIcon
                        verifiedSources={verifiedSources}
                        verificationFoundSources={verificationFoundSources}
                        isLoading={isLoading}
                    />
                </div>

                {isLoading ? (
                    <span className="e-spinner-grow e-spinner-grow-sm e-text-white md:e-mb-1" />
                ) : (
                    <div className="e-flex e-flex-shrink-0 e-items-center e-gap-1">
                        {hasVerification ? (
                            verificationFoundSources.map((source, idx) => (
                                <div key={idx} className={sourceBorderVariants({ tone: getSourceBorderTone(source) })}>
                                    {source.icon}
                                </div>
                            ))
                        ) : (
                            <span className="e-font-semibold e-text-heavy-metal-400 md:e-text-base">Not verified</span>
                        )}
                    </div>
                )}
            </button>
        );
    }
);

TokenVerificationButton.displayName = 'TokenVerificationButton';
