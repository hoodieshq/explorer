'use client';

import { useCluster } from '@providers/cluster';
import { useCallback, useRef, useState } from 'react';
import useSWRImmutable from 'swr/immutable';

import { fetchMetadataHistory, type MetadataHistoryResult } from '../lib/fetch-metadata-history';

export function useProgramMetadataHistory(programAddress: string, seed: string) {
    const { url } = useCluster();
    const [progress, setProgress] = useState<string>('');
    const progressRef = useRef(setProgress);
    progressRef.current = setProgress;

    const onProgress = useCallback((phase: string) => {
        progressRef.current(phase);
    }, []);

    const { data, error, isLoading } = useSWRImmutable<MetadataHistoryResult>(
        ['program-metadata-history', programAddress, seed, url],
        () => fetchMetadataHistory(programAddress, seed, url, onProgress),
    );

    return {
        data,
        error,
        isLoading,
        progress,
    };
}
