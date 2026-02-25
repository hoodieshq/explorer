'use client';

import { useHoverPopover } from '@/app/components/shared/hooks';
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
    const { hoverHandlers, isOpen, setIsOpen } = useHoverPopover();

    const { rateLimitedSources, unverifiedSources, verificationFoundSources, verifiedSources } =
        useTokenVerification(tokenInfo);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild {...hoverHandlers}>
                <TokenVerificationButton
                    isLoading={isTokenInfoLoading}
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
                {...hoverHandlers}
            >
                <TokenVerificationContent
                    isLoading={isTokenInfoLoading}
                    rateLimitedSources={rateLimitedSources}
                    unverifiedSources={unverifiedSources}
                    verificationFoundSources={verificationFoundSources}
                />
            </PopoverContent>
        </Popover>
    );
}
