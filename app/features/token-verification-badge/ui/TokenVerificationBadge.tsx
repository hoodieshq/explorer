'use client';

import { type VerificationTarget } from '../lib/types';
import { useTokenVerification } from '../model/use-verification-sources';
import { BaseTokenVerificationBadge } from './BaseTokenVerificationBadge';
import { type TokenVerificationButtonLayout } from './TokenVerificationButton';

export type TokenVerificationBadgeProps = {
    target: VerificationTarget;
    isTokenInfoLoading?: boolean;
    layout?: TokenVerificationButtonLayout;
};

export function TokenVerificationBadge({ target, isTokenInfoLoading, layout }: TokenVerificationBadgeProps) {
    const verificationResult = useTokenVerification(target);

    return (
        <BaseTokenVerificationBadge
            verificationResult={verificationResult}
            isLoading={isTokenInfoLoading}
            layout={layout}
        />
    );
}
