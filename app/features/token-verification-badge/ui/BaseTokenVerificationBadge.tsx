import { useHoverPopover } from '@/app/components/shared/hooks';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';

import { TokenVerificationResult } from '../model/use-verification-sources';
import { TokenVerificationButton, type TokenVerificationButtonLayout } from './TokenVerificationButton';
import { TokenVerificationContent } from './TokenVerificationContent';

export type BaseTokenVerificationBadgeProps = {
    verificationResult: TokenVerificationResult;
    isLoading?: boolean;
    layout?: TokenVerificationButtonLayout;
};

export function BaseTokenVerificationBadge({ verificationResult, isLoading, layout }: BaseTokenVerificationBadgeProps) {
    const { hoverHandlers, isOpen, setIsOpen } = useHoverPopover();

    const { rateLimitedSources, sourcesToApply, verificationFoundSources } = verificationResult;

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild {...hoverHandlers}>
                <TokenVerificationButton
                    isLoading={isLoading}
                    isOpen={isOpen}
                    layout={layout}
                    verificationFoundSources={verificationFoundSources}
                />
            </PopoverTrigger>
            <PopoverContent align="start" collisionPadding={8} side="bottom" className="w-72 p-4" {...hoverHandlers}>
                <TokenVerificationContent
                    isLoading={isLoading}
                    rateLimitedSources={rateLimitedSources}
                    sourcesToApply={sourcesToApply}
                    verificationFoundSources={verificationFoundSources}
                />
            </PopoverContent>
        </Popover>
    );
}
