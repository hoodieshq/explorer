import type { Transaction } from '@solana/web3.js';

import { toBase64 } from '@/app/shared/lib/bytes';
import { Logger } from '@/app/shared/lib/logger';

export function serializeTransactionMessage(transaction: Transaction | undefined): string | null {
    if (!transaction) return null;
    try {
        return toBase64(transaction.serializeMessage());
    } catch (error) {
        Logger.warn('[idl] Failed to serialize transaction message', { error });
        return null;
    }
}
