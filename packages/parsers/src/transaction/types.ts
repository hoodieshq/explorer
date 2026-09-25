import type { Address } from '@solana/kit';

export type TransactionVersion = 'legacy' | 0 | 1;

/** What an RPC reports before a message is decoded. `null` means the caller omitted the version ceiling. */
export type ReportedTransactionVersion = TransactionVersion | null;

export type AddressTableLookup = {
    accountKey: Address;
    readonlyIndexes: readonly number[];
    writableIndexes: readonly number[];
};

export type TransactionAccount = {
    address: Address;
    signer: boolean;
    writable: boolean;
    source: 'static' | 'lookupTable';
    /** The lookup table this address came from, when the encoding reports it. v0 only. */
    lookupTableAddress?: Address;
};

export type TransactionInstruction = {
    programAddress: Address;
    accounts: readonly TransactionAccount[];
    /** Absent when the RPC sent a parsed instruction instead of its data. */
    data?: Uint8Array;
    /** The RPC's own decode, under `jsonParsed` encoding only. */
    parsed?: unknown;
};

export type TransactionConfig = {
    computeUnitLimit?: number;
    heapSize?: number;
    loadedAccountsDataSizeLimit?: number;
    /** A total, in lamports. Legacy and v0 have no equivalent: they price per compute unit. */
    priorityFeeLamports?: bigint;
};

type TransactionBase = {
    accounts: readonly TransactionAccount[];
    instructions: readonly TransactionInstruction[];
    lifetimeToken: string;
    numSignerAccounts: number;
    signatures: readonly (string | undefined)[];
    /** Loaded addresses missing from every listed lookup table. Absent when the encoding omits them. */
    unmatchedLookupTableAddresses?: readonly Address[];
    /** Lookup table indexes which are not matched by any loaded addresses. Absent when the encoding omits the tables. */
    unmatchedLookupTableIndexes?: readonly AddressTableLookup[];
};

export type ParsedTransaction =
    | (TransactionBase & { version: 'legacy' })
    | (TransactionBase & {
          version: 0;
          /** `undefined` means the encoding never reported the tables, as `jsonParsed` does. `[]` means none. */
          addressTableLookups?: readonly AddressTableLookup[];
      })
    | (TransactionBase & { version: 1; config?: TransactionConfig });

/**
 * `loadedAddresses` is RPC-shaped: plain strings, because that is what every caller holds.
 * The constructors widen it to `Address` before resolution.
 * kit's own `LoadedAddresses` type is `Address[]`, so it is assignable here too.
 */
export type FromMessageOptions = {
    loadedAddresses?: { readonly: readonly string[]; writable: readonly string[] } | null;
    signatures?: readonly (string | undefined)[];
};

/**
 * The part of a `getTransaction` or `getBlock` transaction entry the union needs.
 *
 * Declared structurally, not derived from kit's overloaded `GetTransactionApi`. That type resolves to
 * whichever overload is declared last, whatever encoding was requested. Numeric fields accept
 * `number | bigint`, because kit sends bigint only where its integer allow-list declares it, and `version`
 * is not on that list.
 */
export type RpcTransactionResponse = {
    meta?: {
        loadedAddresses?: { readonly: readonly string[]; writable: readonly string[] } | null;
    } | null;
    transaction: RpcWireTransaction | RpcJsonTransaction | RpcJsonParsedTransaction;
    version?: ReportedTransactionVersion | bigint;
};

export type RpcTransactionConfig = {
    computeUnitLimit: number | null;
    heapSize: number | null;
    loadedAccountsDataSizeLimit: number | null;
    priorityFee: bigint | null;
};

/** `encoding: 'base64' | 'base58'`. A `[data, encoding]` pair. */
export type RpcWireTransaction = readonly [string, 'base58' | 'base64'];

/** `encoding: 'json'`. The compiled message, with a header and instructions addressed by index. */
export type RpcJsonTransaction = {
    message: {
        accountKeys: readonly string[];
        addressTableLookups?: readonly {
            accountKey: string;
            readonlyIndexes: readonly number[];
            writableIndexes: readonly number[];
        }[];
        header: {
            numReadonlySignedAccounts: number;
            numReadonlyUnsignedAccounts: number;
            numRequiredSignatures: number;
        };
        instructions: readonly { accounts: readonly number[]; data: string; programIdIndex: number }[];
        recentBlockhash: string;
        transactionConfig?: RpcTransactionConfig;
    };
    signatures: readonly string[];
};

/** `encoding: 'jsonParsed'`. No header. The RPC resolved every account role and may have decoded the data. */
export type RpcJsonParsedTransaction = {
    message: {
        accountKeys: readonly {
            pubkey: string;
            signer: boolean;
            source: 'lookupTable' | 'transaction';
            writable: boolean;
        }[];
        instructions: readonly (
            | { accounts: readonly string[]; data: string; programId: string }
            | { parsed: unknown; program: string; programId: string }
        )[];
        recentBlockhash: string;
        transactionConfig?: RpcTransactionConfig;
    };
    signatures: readonly string[];
};
