// Ported from the solana-mcp-official fork (feat/account-resolver); instruction entries come from
// the decode cascade so the payload builder stays a pure context→wire-shape mapping.
import type {
    TransactionInstructionEntry,
    TransactionPayloadContext,
    TransactionPayloadOutput,
    TransactionResourceLimits,
} from './types.js';

export function buildTransactionPayload(
    context: TransactionPayloadContext,
    instructions: TransactionInstructionEntry[],
): TransactionPayloadOutput {
    const safeSignerCount = Math.max(0, context.numRequiredSignatures);
    const signers = context.accountKeys.slice(0, safeSignerCount);
    const { requestedComputeUnits, resourceLimits } = context;

    const base = {
        accounts: context.resolvedAccounts,
        block_time: context.blockTime,
        compute_units_consumed: context.computeUnitsConsumed,
        confirmation_status: context.confirmationStatus,
        confirmations: context.confirmations,
        fee_lamports: context.feeLamports,
        instructions,
        kind: 'transaction' as const,
        log_messages: context.logMessages,
        recent_blockhash: context.recentBlockhash,
        requested_compute_units: { source: requestedComputeUnits.source, value: requestedComputeUnits.value },
        ...(resourceLimits !== undefined && { resource_limits: toResourceLimitsEntry(resourceLimits) }),
        signature: context.signature,
        signers,
        slot: context.slot,
        transaction_version: context.version,
    };

    if (context.status === 'failed') {
        return { entity: { ...base, error: context.err, status: context.status } };
    }
    return { entity: { ...base, error: null, status: context.status } };
}

function toResourceLimitsEntry(limits: TransactionResourceLimits) {
    return {
        compute_unit_limit: limits.computeUnitLimit,
        heap_size_bytes: limits.heapSizeBytes,
        loaded_accounts_data_size_limit_bytes: limits.loadedAccountsDataSizeLimitBytes,
        priority_fee_lamports: limits.priorityFeeLamports,
    };
}
