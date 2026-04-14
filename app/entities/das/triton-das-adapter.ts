/**
 * Triton DAS adapter.
 *
 * Uses standard DAS JSON-RPC methods and standard parameters only.
 * Provider-specific options are intentionally excluded.
 * Set TRITON_RPC_URL to your Triton RPC endpoint (API key embedded in the URL).
 */

import fetch from 'node-fetch';

import { Logger } from '@/app/shared/lib/logger';

import type { DasAsset, DasGetAssetBatchResponse, DasJsonRpcError } from './types';

function isDasError(response: unknown): response is DasJsonRpcError {
    return (
        !!response &&
        typeof response === 'object' &&
        'error' in response &&
        typeof (response as DasJsonRpcError).error === 'object'
    );
}

/**
 * Fetch metadata for multiple assets in one call.
 * Returns null if DAS is not configured or the request fails.
 */
export async function getAssetBatch(ids: string[], signal?: AbortSignal): Promise<DasAsset[] | null> {
    const url = process.env.TRITON_RPC_URL;
    if (!url) {
        Logger.warn('[das:triton] TRITON_RPC_URL is not configured — skipping enrichment');
        return null;
    }

    if (ids.length === 0) return [];

    try {
        const response = await fetch(url, {
            body: JSON.stringify({
                id: 'explorer-search',
                jsonrpc: '2.0',
                method: 'getAssets',
                params: {
                    ids,
                },
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            signal,
        });

        if (!response.ok) {
            Logger.warn(`[das:triton] getAssets returned ${response.status}`, { sentry: true });
            return null;
        }

        const data = (await response.json()) as DasGetAssetBatchResponse | DasJsonRpcError;

        if (isDasError(data)) {
            Logger.warn('[das:triton] getAssets error', {
                dasError: data.error.message,
                sentry: true,
            });
            return null;
        }

        return data.result;
    } catch (error) {
        Logger.error(error instanceof Error ? error : new Error('[das:triton] getAssets failed'), {
            sentry: true,
        });
        return null;
    }
}
