// Maps a json getTransaction probe to TransactionPayloadContext.
import {
    fromRpcTransaction,
    getRequestedComputeUnits,
    getV1ResourceLimits,
    hasUnmatchedLookupTables,
    normalizeVersion,
    type ParsedTransaction,
    type TransactionVersion,
    type V1ResourceLimits,
} from '@explorer/parsers/transaction';
import { err, getEpochForSlot, ok, type Result } from '@explorer/utils';

import type { SupportedCluster } from '../config.js';
import { type InspectorLogger, ns } from '../logger.js';
import { asRecord, asSafeNumeric } from '../shared/parse-helpers.js';
import type {
    CompiledInnerInstruction,
    CompiledInstruction,
    ConfirmationStatus,
    SignatureStatusEnvelope,
    SignatureStatusValue,
    TransactionProbeEnvelope,
} from '../rpc/types.js';
import { EPOCH_SCHEDULES } from './epoch-schedule.js';
import type {
    ReportedTransactionVersion,
    TransactionPayloadContext,
    TransactionResourceLimits,
    TransactionVersionContext,
} from './types.js';

function toAccountKeyString(accountKey: string | { pubkey: string }): string {
    if (typeof accountKey === 'string') {
        return accountKey;
    }
    if (typeof accountKey?.pubkey === 'string') {
        return accountKey.pubkey;
    }
    throw new Error(
        `Unexpected transaction probe: accountKey is not a string or {pubkey: string}: ${JSON.stringify(accountKey)}`,
    );
}

// Inner instructions live in `meta`, outside `ParsedTransaction`, so their indices are checked here.
function validateInnerInstructionIndices(instructions: readonly CompiledInstruction[], accountKeyCount: number): void {
    for (const ix of instructions) {
        if (
            ix.programIdIndex < 0 ||
            ix.programIdIndex >= accountKeyCount ||
            ix.accounts.some(idx => idx < 0 || idx >= accountKeyCount)
        ) {
            throw new Error(
                `Unexpected transaction probe: inner instruction index out of bounds (programIdIndex=${ix.programIdIndex}, accounts=[${ix.accounts.join(',')}], accountKeyCount=${accountKeyCount}).`,
            );
        }
    }
}

function validateInnerInstructionIntegrity(
    instructions: readonly CompiledInstruction[],
    innerInstructions: readonly CompiledInnerInstruction[] | null,
    totalKeyCount: number,
): void {
    if (!innerInstructions) {
        return;
    }

    for (const group of innerInstructions) {
        if (group.index < 0 || group.index >= instructions.length) {
            throw new Error(
                `Unexpected transaction probe: inner instruction group index (${group.index}) out of bounds for ${instructions.length} instructions.`,
            );
        }
        validateInnerInstructionIndices(group.instructions, totalKeyCount);
    }
}

function isKnownConfirmationStatus(value: string): value is ConfirmationStatus {
    return value === 'processed' || value === 'confirmed' || value === 'finalized';
}

function parseConfirmationStatus(raw: string | null): Result<ConfirmationStatus | null> {
    if (raw === null) return ok(null);
    if (isKnownConfirmationStatus(raw)) return ok(raw);
    return err(new Error(`unknown confirmation status: ${raw}`));
}

function normalizeConfirmation(
    statusValue: SignatureStatusValue | null,
    confirmationStatus: ConfirmationStatus | null,
): {
    confirmationStatus: ConfirmationStatus | null;
    confirmations: number | 'max' | null;
} {
    const rawConfirmations = statusValue?.confirmations ?? null;
    if (confirmationStatus === 'finalized') {
        return { confirmationStatus, confirmations: 'max' };
    }
    if (typeof rawConfirmations === 'bigint') {
        // Confirmation count is bounded by MAX_LOCKOUT_HISTORY (32), safe to convert directly.
        return { confirmationStatus, confirmations: Number(rawConfirmations) };
    }
    if (typeof rawConfirmations === 'number') {
        return { confirmationStatus, confirmations: rawConfirmations };
    }
    return { confirmationStatus, confirmations: null };
}

// Callers guarantee a non-null err (the success/unknown arms never reach here).
function normalizeTransactionError(rawErr: unknown): Result<Record<string, unknown> | string | unknown[]> {
    if (typeof rawErr === 'string') {
        return ok(rawErr);
    }
    if (Array.isArray(rawErr)) {
        return ok(rawErr);
    }
    const record = asRecord(rawErr);
    if (record) {
        return ok(record);
    }
    return err(new Error(`unrecognized err shape: ${String(rawErr)}`));
}

function toSafeResourceLimits(limits: V1ResourceLimits): TransactionResourceLimits {
    return { ...limits, priorityFeeLamports: asSafeNumeric(limits.priorityFeeLamports) };
}

function toVersionContext(
    reportedVersion: ReportedTransactionVersion,
    transaction: ParsedTransaction,
): TransactionVersionContext {
    if (transaction.version === 1) {
        return { resourceLimits: toSafeResourceLimits(getV1ResourceLimits(transaction)), version: 1 };
    }
    // A null reported version parses as legacy, but the payload keeps reporting null.
    return { version: reportedVersion === null ? null : transaction.version };
}

export function normalizeTransactionProbe(
    signature: string,
    envelope: TransactionProbeEnvelope,
    signatureStatus: SignatureStatusEnvelope | null | undefined,
    logger: InspectorLogger,
    cluster: SupportedCluster,
): TransactionPayloadContext | null {
    if (envelope === null) {
        return null;
    }

    const slot = asSafeNumeric(envelope.slot);
    if (typeof slot !== 'number') {
        throw new Error('Unexpected transaction probe: slot is not a safe number.');
    }

    const { header, accountKeys, addressTableLookups, transactionConfig } = envelope.transaction.message;
    const instructions = Array.from(envelope.transaction.message.instructions ?? []);
    const meta = envelope.meta;
    const innerInstructions = meta?.innerInstructions ? Array.from(meta.innerInstructions) : null;
    const recentBlockhash = envelope.transaction.message.recentBlockhash ?? null;

    const reportedVersion: ReportedTransactionVersion =
        envelope.version === undefined || envelope.version === null ? null : normalizeVersion(envelope.version);
    // Without `maxSupportedTransactionVersion` the RPC returns legacy only, so a missing version parses as legacy.
    const parsedVersion: TransactionVersion = reportedVersion ?? 'legacy';

    const transaction = fromRpcTransaction({
        meta: { loadedAddresses: meta?.loadedAddresses ?? null },
        transaction: {
            message: {
                accountKeys: accountKeys.map(toAccountKeyString),
                // Absent means the RPC did not report the tables. Do not default to `[]`, which means "declares none".
                ...(addressTableLookups !== undefined && { addressTableLookups }),
                header,
                instructions,
                recentBlockhash: recentBlockhash ?? '',
                transactionConfig,
            },
            signatures: [],
        },
        version: parsedVersion,
    });

    const allKeys = transaction.accounts.map(account => account.address);
    if (hasUnmatchedLookupTables(transaction)) {
        logger.warn(ns('address table lookup counts do not match the loaded addresses'), { signature });
    }

    validateInnerInstructionIntegrity(instructions, innerInstructions, allKeys.length);

    const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } = header;

    const computeUnitsConsumed = meta ? asSafeNumeric(meta.computeUnitsConsumed ?? null) : null;
    const logMessages = meta?.logMessages ? Array.from(meta.logMessages) : null;
    const epoch = getEpochForSlot(EPOCH_SCHEDULES[cluster], BigInt(slot));
    const requestedComputeUnits = getRequestedComputeUnits(transaction, { cluster, epoch });

    const statusValue = signatureStatus?.value ?? null;
    const rawStatus = statusValue?.confirmationStatus ?? null;
    const [statusError, parsedStatus] = parseConfirmationStatus(rawStatus);
    if (statusError) {
        logger.warn(ns('transaction normalizer: unknown confirmation status'), {
            signature,
            value: rawStatus,
        });
    }
    const { confirmationStatus, confirmations } = normalizeConfirmation(statusValue, parsedStatus ?? null);

    const base = {
        accountKeys: allKeys,
        blockTime: asSafeNumeric(envelope.blockTime),
        computeUnitsConsumed,
        confirmationStatus,
        confirmations,
        feeLamports: meta ? asSafeNumeric(meta.fee) : null,
        innerInstructions,
        instructions,
        logMessages,
        numReadonlySignedAccounts,
        numReadonlyUnsignedAccounts,
        numRequiredSignatures,
        recentBlockhash,
        requestedComputeUnits,
        resolvedAccounts: [...transaction.accounts],
        signature,
        slot,
        ...toVersionContext(reportedVersion, transaction),
    };

    if (meta === null) {
        return { ...base, err: null, status: 'unknown' };
    }
    if (meta.err === null || meta.err === undefined) {
        return { ...base, err: null, status: 'success' };
    }
    const [errShapeError, normalizedError] = normalizeTransactionError(meta.err);
    if (errShapeError) {
        logger.warn(ns('transaction normalizer: unrecognized err shape'), {
            signature,
            value: String(meta.err),
        });
    }
    return { ...base, err: normalizedError ?? String(meta.err), status: 'failed' };
}
