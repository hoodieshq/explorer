'use client';

import { useTxPathBuilder } from '@entities/account-history';
import { type Address } from '@solana/kit';
import React from 'react';

import { useClusterPath } from '@/app/utils/url';

import { useAnchorIdlHistory } from '../model/use-anchor-idl-history';
import { BaseAnchorIdlHistoryCard } from './BaseAnchorIdlHistoryCard';

interface AnchorIdlHistoryCardProps {
    programAddress: Address;
}

export function AnchorIdlHistoryCard({ programAddress }: AnchorIdlHistoryCardProps) {
    const { data, error, isLoading } = useAnchorIdlHistory(programAddress);
    const addressPath = useClusterPath({ pathname: `/address/${programAddress}` });
    const txPathFor = useTxPathBuilder();

    return (
        <BaseAnchorIdlHistoryCard
            programAddress={programAddress}
            data={data}
            isLoading={isLoading}
            error={error}
            addressPath={addressPath}
            txPathFor={txPathFor}
        />
    );
}
