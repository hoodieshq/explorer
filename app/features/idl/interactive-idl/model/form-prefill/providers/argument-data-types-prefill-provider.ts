import { PublicKey } from '@solana/web3.js';

import { ArgumentType } from '../types';

/* eslint-disable sort-keys-fix/sort-keys-fix */
const DEFAULT_VALUES_PER_TYPE: Record<ArgumentType, string> = {
    bool: 'false',
    u8: '1',
    u16: '1',
    u32: '1',
    u64: '1',
    u128: '1',
    i8: '1',
    i16: '1',
    i32: '1',
    i64: '1',
    i128: '1',
    f32: '1.0',
    f64: '1.0',
    string: 'default',
    bytes: 'data',
    publicKey: PublicKey.default.toString(),
    pubkey: PublicKey.default.toString(),
} as const;
/* eslint-enable sort-keys-fix/sort-keys-fix */

const WRAPPED_TYPES_REGEXP = /^(?:option|coption|vec|array)\s*\(\s*([^,)]+)/;

export function findDefaultValueForArgumentType(arg_type: string) {
    const matches = arg_type.match(WRAPPED_TYPES_REGEXP);
    if (matches) {
        return DEFAULT_VALUES_PER_TYPE[matches[1] as ArgumentType] || '';
    }
    return DEFAULT_VALUES_PER_TYPE[arg_type as ArgumentType] || '';
}
