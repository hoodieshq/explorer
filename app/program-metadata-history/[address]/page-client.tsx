'use client';

import { useSearchParams } from 'next/navigation';
import React, { useCallback, useState } from 'react';

import { ProgramMetadataHistoryCard } from '@/app/features/program-metadata-history';

interface Props {
    address: string;
}

export default function ProgramMetadataHistoryPageClient({ address }: Props) {
    const searchParams = useSearchParams();
    const initialSeed = searchParams?.get('seed') ?? 'idl';
    const [seed, setSeed] = useState(initialSeed);

    const handleSeedChange = useCallback((newSeed: string) => {
        setSeed(newSeed);
        // Update URL without navigation
        const url = new URL(window.location.href);
        url.searchParams.set('seed', newSeed);
        window.history.replaceState({}, '', url.toString());
    }, []);

    return (
        <div className="container mt-4">
            <ProgramMetadataHistoryCard
                programAddress={address}
                seed={seed}
                onSeedChange={handleSeedChange}
            />
        </div>
    );
}
