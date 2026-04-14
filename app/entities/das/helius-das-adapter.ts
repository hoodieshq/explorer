/**
 * Helius DAS adapter.
 *
 * Uses standard DAS JSON-RPC methods and standard parameters only.
 * Provider-specific options (displayOptions, tokenType, etc.) are intentionally excluded.
 * Switching to Triton requires only changing the endpoint URL and method name (getAssetBatch → getAssets).
 */

import fetch from 'node-fetch';

import { Logger } from '@/app/shared/lib/logger';

import type { DasAsset, DasGetAssetBatchResponse, DasJsonRpcError } from './types';

const HELIUS_DAS_ENDPOINT = 'https://mainnet.helius-rpc.com/';

function getHeliusDasUrl(): string | null {
    const apiKey = process.env.HELIUS_API_KEY;
    if (!apiKey) return null;
    return `${HELIUS_DAS_ENDPOINT}?api-key=${apiKey}`;
}

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
    const url = getHeliusDasUrl();
    if (!url) {
        Logger.warn('[das:helius] HELIUS_API_KEY is not configured — skipping enrichment');
        return null;
    }

    if (ids.length === 0) return [];

    try {
        const response = await fetch(url, {
            body: JSON.stringify({
                id: 'explorer-search',
                jsonrpc: '2.0',
                method: 'getAssetBatch',
                params: {
                    ids,
                },
            }),
            headers: { 'Content-Type': 'application/json' },
            method: 'POST',
            signal,
        });

        if (!response.ok) {
            Logger.warn(`[das:helius] getAssetBatch returned ${response.status}`, { sentry: true });
            return null;
        }

        const data = (await response.json()) as DasGetAssetBatchResponse | DasJsonRpcError;

        if (isDasError(data)) {
            Logger.warn('[das:helius] getAssetBatch error', {
                dasError: data.error.message,
                sentry: true,
            });
            return null;
        }

        return data.result;
    } catch (error) {
        Logger.error(error instanceof Error ? error : new Error('[das:helius] getAssetBatch failed'), {
            sentry: true,
        });
        return null;
    }
}
