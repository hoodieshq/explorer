// Ported from the solana-mcp-official fork (feat/account-resolver); instruction entries come from
// the decode cascade so the payload builder stays a pure context→wire-shape mapping.
import type {
    TransactionInstructionEntry,
    TransactionPayloadContext,
    TransactionPayloadEntityBase,
    TransactionPayloadOutput,
    TransactionResourceLimits,
    TransactionResourceLimitsEntry,
    TransactionVersionEntity,
} from './types.js';

export function buildTransactionPayload(
    context: TransactionPayloadContext,
    instructions: TransactionInstructionEntry[],
): TransactionPayloadOutput {
    const safeSignerCount = Math.max(0, context.numRequiredSignatures);
    const signers = context.accountKeys.slice(0, safeSignerCount);
    const { requestedComputeUnits } = context;

    const head = {
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
    };
    const tail = { signature: context.signature, signers, slot: context.slot };

    // `resource_limits` sits between head and tail to keep the wire keys in alphabetical order.
    const entity: TransactionPayloadEntityBase & TransactionVersionEntity =
        context.version === 1
            ? {
                  ...head,
                  resource_limits: toResourceLimitsEntry(context.resourceLimits),
                  ...tail,
                  transaction_version: 1,
              }
            : { ...head, ...tail, transaction_version: context.version };

    if (context.status === 'failed') {
        return { entity: { ...entity, error: context.err, status: context.status } };
    }
    return { entity: { ...entity, error: null, status: context.status } };
}

function toResourceLimitsEntry(limits: TransactionResourceLimits): TransactionResourceLimitsEntry {
    return {
        compute_unit_limit: limits.computeUnitLimit,
        heap_size_bytes: limits.heapSizeBytes,
        loaded_accounts_data_size_limit_bytes: limits.loadedAccountsDataSizeLimitBytes,
        priority_fee_lamports: limits.priorityFeeLamports,
    };
}
