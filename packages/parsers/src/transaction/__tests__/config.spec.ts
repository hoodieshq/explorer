import {
    TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK,
    TRANSACTION_CONFIG_HEAP_SIZE_BIT_MASK,
    TRANSACTION_CONFIG_LOADED_ACCOUNTS_DATA_SIZE_LIMIT_BIT_MASK,
    TRANSACTION_CONFIG_PRIORITY_FEE_LAMPORTS_BIT_MASK,
} from '@solana/kit';
import { describe, expect, it } from 'vitest';

import { gen } from '../../__tests__/gen.js';
import { fromRpcTransactionConfig, getTransactionConfig, readTransactionConfig } from '../config.js';
import type { ParsedTransaction, RpcTransactionConfig } from '../types.js';
import { v0Transaction, v1CompiledWithConfig } from './fixtures.js';

const BASE = {
    accounts: [],
    instructions: [],
    lifetimeToken: gen.blockhash(7),
    numSignerAccounts: 1,
    signatures: [],
};

describe('readTransactionConfig', () => {
    it('should read every limit the mask declares in wire order', () => {
        const message = v1CompiledWithConfig({
            configMask:
                TRANSACTION_CONFIG_PRIORITY_FEE_LAMPORTS_BIT_MASK |
                TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK |
                TRANSACTION_CONFIG_LOADED_ACCOUNTS_DATA_SIZE_LIMIT_BIT_MASK |
                TRANSACTION_CONFIG_HEAP_SIZE_BIT_MASK,
            configValues: [
                { kind: 'u64', value: 24n },
                { kind: 'u32', value: 19 },
                { kind: 'u32', value: 32_000 },
                { kind: 'u32', value: 256 },
            ],
        });

        expect(readTransactionConfig(message)).toEqual({
            computeUnitLimit: 19,
            heapSize: 256,
            loadedAccountsDataSizeLimit: 32_000,
            priorityFeeLamports: 24n,
        });
    });

    it('should read a single declared limit and leave the rest absent', () => {
        const message = v1CompiledWithConfig({
            configMask: TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK,
            configValues: [{ kind: 'u32', value: 19 }],
        });

        expect(readTransactionConfig(message)).toEqual({ computeUnitLimit: 19 });
    });

    it('should return undefined for a message that declares no limits', () => {
        const message = v1CompiledWithConfig({ configMask: 0, configValues: [] });

        expect(readTransactionConfig(message)).toBeUndefined();
    });

    it('should return undefined for a version that cannot carry config', () => {
        expect(readTransactionConfig(v0Transaction.compiled())).toBeUndefined();
    });

    it('should return undefined for a partially-set priority fee mask', () => {
        const message = v1CompiledWithConfig({ configMask: 0b01, configValues: [{ kind: 'u64', value: 1n }] });

        expect(readTransactionConfig(message)).toBeUndefined();
    });

    it('should return undefined when a value has the wrong kind for its field', () => {
        const message = v1CompiledWithConfig({
            configMask: TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK,
            configValues: [{ kind: 'u64', value: 19n }],
        });

        expect(readTransactionConfig(message)).toBeUndefined();
    });

    it('should return undefined when the mask declares more values than arrived', () => {
        const message = v1CompiledWithConfig({
            configMask: TRANSACTION_CONFIG_COMPUTE_UNIT_LIMIT_BIT_MASK,
            configValues: [],
        });

        expect(readTransactionConfig(message)).toBeUndefined();
    });
});

// The RPC marks an absent limit null, where the package's own config type leaves the field out.
// eslint-disable-next-line unicorn/no-null
const ABSENT = null;

function rpcConfig(overrides: Partial<RpcTransactionConfig> = {}): RpcTransactionConfig {
    return {
        computeUnitLimit: ABSENT,
        heapSize: ABSENT,
        loadedAccountsDataSizeLimit: ABSENT,
        priorityFee: ABSENT,
        ...overrides,
    };
}

describe('fromRpcTransactionConfig', () => {
    it('should drop the nulls the RPC sends for absent limits', () => {
        const config = fromRpcTransactionConfig(rpcConfig({ computeUnitLimit: 19, priorityFee: 24n }));

        expect(config).toEqual({ computeUnitLimit: 19, priorityFeeLamports: 24n });
    });

    it('should return undefined when every limit is null', () => {
        expect(fromRpcTransactionConfig(rpcConfig())).toBeUndefined();
    });

    it('should return undefined when the response carried no config at all', () => {
        expect(fromRpcTransactionConfig(undefined)).toBeUndefined();
    });
});

describe('getTransactionConfig', () => {
    it('should return the config of a v1 tx', () => {
        const transaction: ParsedTransaction = { ...BASE, config: { computeUnitLimit: 19 }, version: 1 };

        expect(getTransactionConfig(transaction)).toEqual({ computeUnitLimit: 19 });
    });

    it('should return undefined for a v0 tx', () => {
        const transaction: ParsedTransaction = { ...BASE, addressTableLookups: [], version: 0 };

        expect(getTransactionConfig(transaction)).toBeUndefined();
    });
});
