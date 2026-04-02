'use client';

import Link from 'next/link';
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/shared/ui/card';
import { useClusterPath } from '@/app/utils/url';

import { useProgramMetadataHistory } from '../model/use-program-metadata-history';
import { CurrentContent } from './CurrentContent';
import { HistoryStats } from './HistoryStats';
import { HistoryTimeline } from './HistoryTimeline';
import { SeedSelector } from './SeedSelector';
import { TimelineSkeleton } from './TimelineSkeleton';

interface ProgramMetadataHistoryCardProps {
    programAddress: string;
    seed: string;
    onSeedChange: (seed: string) => void;
}

export function ProgramMetadataHistoryCard({ programAddress, seed, onSeedChange }: ProgramMetadataHistoryCardProps) {
    const { data, error, isLoading, progress } = useProgramMetadataHistory(programAddress, seed);
    const addressPath = useClusterPath({ pathname: `/address/${programAddress}` });

    return (
        <Card>
            <CardHeader>
                <div className="e-flex e-flex-col e-gap-4 sm:e-flex-row sm:e-items-center sm:e-justify-between">
                    <div>
                        <CardTitle className="e-text-lg">Program Metadata History</CardTitle>
                        <div className="e-mt-1 e-text-xs e-text-neutral-500">
                            <Link href={addressPath} className="e-font-mono e-text-teal-400 hover:e-underline">
                                {programAddress.slice(0, 16)}...{programAddress.slice(-8)}
                            </Link>
                            {data?.pdaAddress && (
                                <span className="e-ml-2">
                                    PDA:{' '}
                                    <span className="e-font-mono">
                                        {data.pdaAddress.slice(0, 8)}...
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>
                    <SeedSelector seed={seed} onSeedChange={onSeedChange} />
                </div>
            </CardHeader>

            <CardContent>
                {isLoading && (
                    <div className="e-space-y-4">
                        {progress && (
                            <div className="e-text-sm e-text-neutral-400">{progress}</div>
                        )}
                        <TimelineSkeleton />
                    </div>
                )}

                {error && !isLoading && (
                    <div className="e-rounded-lg e-border e-border-solid e-border-red-900 e-bg-red-950/30 e-p-4 e-text-sm e-text-red-400">
                        {getErrorMessage(error)}
                    </div>
                )}

                {data && !isLoading && (
                    <>
                        {data.snapshots.length === 0 ? (
                            <div className="e-py-8 e-text-center e-text-sm e-text-neutral-500">
                                No metadata history found for seed &ldquo;{seed}&rdquo; on this program.
                            </div>
                        ) : (
                            <div className="e-space-y-6">
                                <HistoryStats snapshots={data.snapshots} />
                                <CurrentContent programAddress={programAddress} seed={seed} />
                                <HistoryTimeline snapshots={data.snapshots} />
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        if (error.message.includes('Account') && error.message.includes('not found')) {
            return 'No metadata account found for this program and seed combination.';
        }
        return error.message;
    }
    return 'An unexpected error occurred while fetching metadata history.';
}
