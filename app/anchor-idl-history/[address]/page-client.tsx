'use client';

import { address as toKitAddress } from '@solana/kit';
import React from 'react';

import { AnchorIdlHistoryCard } from '@/app/features/anchor-idl-history';

interface Props {
    address: string;
}

export default function AnchorIdlHistoryPageClient({ address }: Props) {
    return (
        <div className="container mt-4">
            <AnchorIdlHistoryCard programAddress={toKitAddress(address)} />
        </div>
    );
}
