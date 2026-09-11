import { PublicKey } from '@solana/web3.js';

import type { UnifiedAccounts } from '../unified-program.d';

/**
 * Normalize form-shaped account values into `UnifiedAccounts`.
 * Blank and missing values become null so the resolver can apply the IDL's own default.
 * Throws on a malformed address, which is the expected outcome for a partially typed form.
 */
export function normalizeAccounts(accounts: Record<string, string> | UnifiedAccounts): UnifiedAccounts {
    const normalized: UnifiedAccounts = {};

    for (const [key, value] of Object.entries(accounts)) {
        if (!value) {
            // eslint-disable-next-line unicorn/no-null -- UnifiedAccounts and the codama client both use null for "unset"
            normalized[key] = null;
        } else if (typeof value === 'string') {
            if (value.trim() === '') {
                // eslint-disable-next-line unicorn/no-null -- UnifiedAccounts and the codama client both use null for "unset"
                normalized[key] = null;
            } else {
                try {
                    normalized[key] = new PublicKey(value);
                } catch {
                    throw new Error(`Invalid public key for account "${key}": ${value}`);
                }
            }
        } else {
            normalized[key] = value;
        }
    }

    return normalized;
}
