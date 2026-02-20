'use client';

import { useEffect, useRef, useState } from 'react';

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
    const [alignRight, setAlignRight] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const {
        isLoading: isVerificationLoading,
        verifiedSources,
        unverifiedSources,
        verificationFoundSources,
    } = useTokenVerification(tokenInfo);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const dropdownWidth = 300;
            const wouldOverflow = rect.left + dropdownWidth > window.innerWidth;
            setAlignRight(wouldOverflow);
        }
    }, [isOpen]);

    const isLoading = isVerificationLoading || isTokenInfoLoading;

    return (
        <div ref={containerRef} className="e-relative e-w-full md:e-h-[stretch]">
            <TokenVerificationButton
                isLoading={isLoading}
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                verifiedSources={verifiedSources}
                verificationFoundSources={verificationFoundSources}
            />

            {isOpen && (
                <TokenVerificationContent
                    verifiedSources={verifiedSources}
                    unverifiedSources={unverifiedSources}
                    verificationFoundSources={verificationFoundSources}
                    alignRight={alignRight}
                />
            )}
        </div>
    );
}
