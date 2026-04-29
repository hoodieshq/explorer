'use client';

import { useTxPathBuilder } from '@entities/account-history';
import { type Address } from '@solana/kit';
import React from 'react';

import { useClusterPath } from '@/app/utils/url';

import { useProgramMetadataHistory } from '../model/use-program-metadata-history';
import { BaseProgramMetadataHistoryCard } from './BaseProgramMetadataHistoryCard';

interface ProgramMetadataHistoryCardProps {
    programAddress: Address;
    seed: string;
    onSeedChange: (seed: string) => void;
}

export function ProgramMetadataHistoryCard({ programAddress, seed, onSeedChange }: ProgramMetadataHistoryCardProps) {
    const { data, error, isLoading } = useProgramMetadataHistory(programAddress, seed);
    const addressPath = useClusterPath({ pathname: `/address/${programAddress}` });
    const txPathFor = useTxPathBuilder();

    return (
        <BaseProgramMetadataHistoryCard
            programAddress={programAddress}
            seed={seed}
            onSeedChange={onSeedChange}
            data={data}
            isLoading={isLoading}
            error={error}
            addressPath={addressPath}
            txPathFor={txPathFor}
        />
    );
}
