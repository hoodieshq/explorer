import type { ReportedTransactionVersion, RequestedComputeUnits } from '@explorer/parsers/transaction';

import type { CompiledInnerInstruction, CompiledInstruction, ConfirmationStatus } from '../rpc/types.js';
import type { SafeNumeric } from '../shared/types.js';

export type ResolvedAccount = {
    address: string;
    signer: boolean;
    writable: boolean;
    source: 'static' | 'lookupTable';
    lookupTableAddress?: string;
};

/** Effective v1 limits. Each one is the declared value, or the runtime default where the message declares none. */
export type TransactionResourceLimits = {
    computeUnitLimit: number;
    heapSizeBytes: number;
    loadedAccountsDataSizeLimitBytes: number;
    priorityFeeLamports: SafeNumeric;
};

type TransactionPayloadContextBase = {
    signature: string;
    slot: number;
    blockTime: SafeNumeric;
    feeLamports: SafeNumeric;
    version: ReportedTransactionVersion;
    computeUnitsConsumed: SafeNumeric;
    requestedComputeUnits: RequestedComputeUnits;
    logMessages: readonly string[] | null;
    recentBlockhash: string | null;
    confirmationStatus: ConfirmationStatus | null;
    confirmations: number | 'max' | null;
    accountKeys: string[];
    resolvedAccounts: ResolvedAccount[];
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
    instructions: readonly CompiledInstruction[];
    innerInstructions: readonly CompiledInnerInstruction[] | null;
    /** Absent for legacy and v0. They budget through Compute Budget instructions. */
    resourceLimits?: TransactionResourceLimits;
};

export type TransactionPayloadContext =
    | (TransactionPayloadContextBase & { status: 'success'; err: null })
    | (TransactionPayloadContextBase & {
          status: 'failed';
          /** Raw error from the RPC response. */
          err: Record<string, unknown> | string | unknown[] | null;
      })
    | (TransactionPayloadContextBase & { status: 'unknown'; err: null });

export type DecodedInstructionSource = 'idl' | 'bundled' | 'raw';

export type DecodedInstructionInfo = {
    /** Decoder-declared program label (e.g. 'spl-token'); omitted when the decoder has none. */
    program?: string;
    type: string;
    info: unknown;
    /** IDL-declared role → address; absent off the codama arm and when the IDL names no accounts. */
    accounts?: Record<string, string>;
    /** Token-program amounts in whole tokens, derived from the decode's own `decimals`. */
    ui_amount?: string;
};

type TransactionInstructionEntryBase = {
    program_id: string;
    accounts: string[];
    /** base58-encoded instruction data, as delivered by json-encoded getTransaction. */
    data: string;
    source: DecodedInstructionSource;
    decoded?: DecodedInstructionInfo;
};

export type TransactionInstructionEntry = TransactionInstructionEntryBase & {
    inner_instructions: TransactionInstructionEntryBase[];
};

export type FallbackInstructionAccount = {
    address: string;
    signer: boolean;
    writable: boolean;
};

export type FallbackInstruction = {
    programId: string;
    accounts: FallbackInstructionAccount[];
    /** base58-encoded instruction data. */
    data: string;
};

/** Host-app decoder for programs the package has no built-in support for — `undefined` means "cannot decode". */
export type DecodeInstructionFallback = (instruction: FallbackInstruction) => DecodedInstructionInfo | undefined;

type TransactionPayloadEntityBase = {
    kind: 'transaction';
    signature: string;
    slot: number;
    block_time: SafeNumeric;
    fee_lamports: SafeNumeric;
    signers: string[];
    /** `null` reports that the caller omitted the version ceiling. A decoded message always has a version. */
    transaction_version: ReportedTransactionVersion;
    recent_blockhash: string | null;
    /** v1 only. Each limit is the declared value, or the runtime default where the message declares none. */
    resource_limits?: {
        compute_unit_limit: number;
        heap_size_bytes: number;
        loaded_accounts_data_size_limit_bytes: number;
        priority_fee_lamports: SafeNumeric;
    };
    compute_units_consumed: SafeNumeric;
    /**
     * `declared` reads the transaction's own limit. `calculated` sums per-instruction reserves at the slot's epoch.
     * `fallback` marks a v1 transaction with no declared limit. The runtime budgets it zero.
     */
    requested_compute_units: { source: RequestedComputeUnits['source']; value: number };
    confirmation_status: ConfirmationStatus | null;
    confirmations: number | 'max' | null;
    log_messages: readonly string[] | null;
    accounts: ResolvedAccount[];
    instructions: TransactionInstructionEntry[];
};

export type TransactionPayloadOutput = {
    entity:
        | (TransactionPayloadEntityBase & { status: 'success'; error: null })
        | (TransactionPayloadEntityBase & {
              status: 'failed';
              error: Record<string, unknown> | string | unknown[] | null;
          })
        | (TransactionPayloadEntityBase & { status: 'unknown'; error: null });
};
