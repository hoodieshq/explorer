'use client';

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/shared/ui/popover';

import { TokenVerificationResult } from '../model/use-verification-sources';
import { TokenVerificationButton } from '../ui/TokenVerificationButton';
import { TokenVerificationContent } from '../ui/TokenVerificationContent';
import {
    createMockVerificationResult,
    mockAllVerifiedSources,
    mockDangerousTokenSources,
    mockNotVerifiedSources,
    mockPartiallyVerifiedSources,
    mockRateLimitedSources,
} from './mock-verification-data';

/**
 * Story wrapper that renders TokenVerificationBadge UI with mocked verification data.
 * This allows testing all UI states without requiring actual API calls.
 */
function TokenVerificationBadge({
    mockResult,
    isLoading,
}: {
    mockResult: TokenVerificationResult;
    isLoading?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);

    const { rateLimitedSources, unverifiedSources, verificationFoundSources, verifiedSources } = mockResult;

    const handleMouseEnter = () => setIsOpen(true);
    const handleMouseLeave = () => setIsOpen(false);

    return (
        <Popover onOpenChange={setIsOpen} open={isOpen}>
            <PopoverTrigger asChild onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                <TokenVerificationButton
                    isLoading={isLoading}
                    isOpen={isOpen}
                    verificationFoundSources={verificationFoundSources}
                    verifiedSources={verifiedSources}
                />
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="e-w-72 e-p-4"
                collisionPadding={8}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                side="bottom"
            >
                <TokenVerificationContent
                    rateLimitedSources={rateLimitedSources}
                    unverifiedSources={unverifiedSources}
                    verificationFoundSources={verificationFoundSources}
                    isLoading={isLoading}
                />
            </PopoverContent>
        </Popover>
    );
}

const meta = {
    component: TokenVerificationBadge,
    title: 'Features/TokenVerification/TokenVerificationBadge',
} satisfies Meta<typeof TokenVerificationBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
    args: {
        isLoading: true,
        mockResult: {
            rateLimitedSources: [],
            sources: [],
            unverifiedSources: [],
            verificationFoundSources: [],
            verifiedSources: [],
        },
    },
};

export const FullyVerified: Story = {
    args: {
        mockResult: createMockVerificationResult(mockAllVerifiedSources()),
    },
};

export const PartiallyVerified: Story = {
    args: {
        mockResult: createMockVerificationResult(mockPartiallyVerifiedSources()),
    },
};

export const NotVerified: Story = {
    args: {
        mockResult: createMockVerificationResult(mockNotVerifiedSources()),
    },
};

export const RateLimited: Story = {
    args: {
        mockResult: createMockVerificationResult(mockRateLimitedSources()),
    },
};

export const DangerousToken: Story = {
    args: {
        mockResult: createMockVerificationResult(mockDangerousTokenSources()),
    },
};
