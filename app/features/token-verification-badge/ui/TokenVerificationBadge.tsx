'use client';

import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';
import { FullLegacyTokenInfo, FullTokenInfo } from '@/app/utils/token-info';

import { useTokenVerification } from '../model/use-verification-sources';
import { TokenVerificationButton } from './TokenVerificationButton';
import { TokenVerificationContent } from './TokenVerificationContent';

export type TokenVerificationBadgeProps = {
    tokenInfo?: FullTokenInfo | FullLegacyTokenInfo;
    isTokenInfoLoading?: boolean;
};

export function TokenVerificationBadge({ tokenInfo, isTokenInfoLoading }: TokenVerificationBadgeProps) {
    const [isOpen, setIsOpen] = useState(false);

    const {
        isLoading: isVerificationLoading,
        verifiedSources,
        unverifiedSources,
        verificationFoundSources,
    } = useTokenVerification(tokenInfo);

    const isLoading = isVerificationLoading || isTokenInfoLoading;

    const handleMouseEnter = () => setIsOpen(true);
    const handleMouseLeave = () => setIsOpen(false);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <TokenVerificationButton
                    isLoading={isLoading}
                    isOpen={isOpen}
                    verifiedSources={verifiedSources}
                    verificationFoundSources={verificationFoundSources}
                />
            </PopoverTrigger>
            <PopoverContent
                align="start"
                collisionPadding={8}
                side="bottom"
                className="e-w-72 e-p-4"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <TokenVerificationContent
                    unverifiedSources={unverifiedSources}
                    verificationFoundSources={verificationFoundSources}
                />
            </PopoverContent>
        </Popover>
    );
}
