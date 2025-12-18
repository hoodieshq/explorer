import { PublicKey } from '@solana/web3.js';
import { coerce, instance, literal, nullable, string, union } from 'superstruct';

export const PublicKeyFromString = coerce(instance(PublicKey), string(), value => new PublicKey(value));

/**
 * Validator for nullable PublicKey that accepts either:
 * - A PublicKey instance
 * - null or undefined
 * - A string (which will be coerced to PublicKey)
 */
export const NullablePublicKey = coerce(
    nullable(instance(PublicKey)),
    union([instance(PublicKey), string(), literal(null), literal(undefined)]),
    value => {
        if (value === null || value === undefined) return null;
        if (value instanceof PublicKey) return value;
        return new PublicKey(value);
    }
);
