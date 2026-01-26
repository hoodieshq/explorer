import type { FormattedReceipt } from '../types';

const receiptCache = new Map<string, { data: FormattedReceipt; timestamp: number }>();

const CACHE_TTL = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 10000;

export function getCachedReceipt(signature: string): FormattedReceipt | null {
    const cached = receiptCache.get(signature);

    if (!cached) {
        return null;
    }

    const now = Date.now();
    if (now - cached.timestamp > CACHE_TTL) {
        receiptCache.delete(signature);
        return null;
    }

    return cached.data;
}

export function setCachedReceipt(signature: string, data: FormattedReceipt): void {
    if (receiptCache.size >= MAX_CACHE_SIZE) {
        const firstKey = receiptCache.keys().next().value;
        
        if (firstKey) {
            receiptCache.delete(firstKey);
        }
    }

    receiptCache.set(signature, {
        data,
        timestamp: Date.now(),
    });
}
