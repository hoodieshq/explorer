import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useMemo } from 'react';

const rpcCallsStatisticsAtom = atom<Record<string, number>>({});

const percentageFormatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    style: 'percent',
});

export type StatisticsItem = {
    method: string;
    count: number;
    percentage: string;
};

export function useRpcCallsStatistics() {
    const rawStatistics = useAtomValue(rpcCallsStatisticsAtom);
    const setStatistics = useSetAtom(rpcCallsStatisticsAtom);

    const onRequest = (request: { body: JsonBody }) => {
        const method = extractMethodFromBody(request.body);
        if (isIgnoredRpcMethod(method)) return;

        setStatistics(prev => ({
            ...prev,
            [method]: (prev[method] || 0) + 1,
        }));
    };

    const customFetch = createFetchWithListeners({ onRequest });

    const statistics = useMemo(() => {
        const sortedStatistics = Object.entries(rawStatistics)
            .map(([method, count]) => ({ count, method }))
            .sort((a, b) => b.count - a.count);

        const total = sortedStatistics.reduce((sum, { count }) => sum + count, 0);

        return sortedStatistics.map(({ method, count }) => ({
            count,
            method,
            percentage: total > 0 ? percentageFormatter.format(count / total) : '0%',
        }));
    }, [rawStatistics]);

    return {
        customFetch,
        statistics,
    };
}

function isIgnoredRpcMethod(_method: string): boolean {
    return false;
}

function extractMethodFromBody(body: JsonBody): string {
    return 'method' in body ? String(body.method) : 'unknown';
}

type JsonBody = Record<string, unknown>;

type RequestListener = (request: { body: JsonBody }) => void;

export function createFetchWithListeners({ onRequest }: { onRequest?: RequestListener }) {
    const customFetch = async (url: URL | RequestInfo, options?: RequestInit): Promise<Response> => {
        let body: JsonBody | undefined;

        if (options?.body) {
            try {
                body = JSON.parse(String(options.body));
            } catch {
                console.error('Error parsing request body');
            }
        }

        if (body) {
            onRequest?.({
                body,
            });
        }

        return fetch(url, options);
    };

    return customFetch;
}
