import type { Transaction } from '@solana/web3.js';

import { toBase64 } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';

export function serializeTransactionMessage(transaction: Transaction | undefined): string | null {
    if (!transaction) return null;
    try {
        return toBase64TransactionMessage(transaction);
    } catch (error) {
        Logger.warn('[idl] Failed to serialize transaction message', { error });
        return null;
    }
}

export function toBase64TransactionMessage(transaction: Transaction): string {
    return toBase64(transaction.serializeMessage())
}
