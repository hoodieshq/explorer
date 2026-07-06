import { lamportsToSolString } from '@/app/utils';
import React from 'react';

export function SolBalance({
    lamports,
    maximumFractionDigits = 9,
}: {
    lamports: number | bigint;
    maximumFractionDigits?: number;
}) {
    return <span className="font-mono">◎{lamportsToSolString(lamports, maximumFractionDigits)}</span>;
}
