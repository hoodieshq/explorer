// Message integrity, account resolution and version narrowing come from @explorer/parsers/transaction.
// What stays here is payload work: status, fee, confirmations and the inner instructions meta carries.
import {
    fromRpcTransaction,
    type ReportedTransactionVersion,
    type TransactionVersion,
    UnsupportedTransactionVersionError,
} from '@explorer/parsers/transaction';

import { type InspectorLogger, ns } from '../logger.js';
import { asRecord, asSafeNumeric } from '../shared/parse-helpers.js';
import { err, ok, type Result } from '../shared/result.js';
import type {
    CompiledInnerInstruction,
    CompiledInstruction,
    ConfirmationStatus,
    SignatureStatusEnvelope,
    SignatureStatusValue,
    TransactionProbeEnvelope,
} from '../rpc/types.js';
import type { TransactionPayloadContext } from './types.js';

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

// Inner instructions ride on `meta`, which the parsed transaction leaves out, so MCP checks their
// indices itself. Outer instruction and header checks belong to `fromRpcTransaction`.
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

/**
 * What the RPC reported, before the message is decoded.
 *
 * `null` means the caller omitted the version ceiling. The parsed union has no such arm, so this
 * mapping lives here, next to the payload field that keeps it.
 */
function toReportedVersion(rawVersion: 'legacy' | number | bigint | null | undefined): ReportedTransactionVersion {
    if (rawVersion === null || rawVersion === undefined) {
        return null;
    }
    const version = typeof rawVersion === 'bigint' ? Number(rawVersion) : rawVersion;
    if (version === 'legacy' || version === 0 || version === 1) {
        return version;
    }
    throw new UnsupportedTransactionVersionError(version);
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

export function normalizeTransactionProbe(
    signature: string,
    envelope: TransactionProbeEnvelope,
    signatureStatus: SignatureStatusEnvelope | null | undefined,
    logger: InspectorLogger,
): TransactionPayloadContext | null {
    if (envelope === null) {
        return null;
    }

    const slot = asSafeNumeric(envelope.slot);
    if (typeof slot !== 'number') {
        throw new Error('Unexpected transaction probe: slot is not a safe number.');
    }

    const { header, accountKeys, addressTableLookups } = envelope.transaction.message;
    const instructions = Array.from(envelope.transaction.message.instructions ?? []);
    const meta = envelope.meta;
    const innerInstructions = meta?.innerInstructions ? Array.from(meta.innerInstructions) : null;
    const recentBlockhash = envelope.transaction.message.recentBlockhash ?? null;

    const reportedVersion = toReportedVersion(envelope.version);
    // An omitted version means the caller set no ceiling, and the RPC then returns legacy only.
    const parsedVersion: TransactionVersion = reportedVersion ?? 'legacy';

    // MCP reports the queried signature and the envelope's blockhash. The parsed signatures and
    // lifetime token have no reader here.
    const transaction = fromRpcTransaction({
        meta: { loadedAddresses: meta?.loadedAddresses ?? null },
        transaction: {
            message: {
                accountKeys: accountKeys.map(toAccountKeyString),
                // Kept absent when the message omits them, so `[]` still reads as "declares none".
                ...(addressTableLookups !== undefined && { addressTableLookups }),
                header,
                instructions,
                recentBlockhash: recentBlockhash ?? '',
            },
            signatures: [],
        },
        version: parsedVersion,
    });

    const allKeys = transaction.accounts.map(account => account.address);
    if (transaction.unmatchedLookupTableAddresses || transaction.unmatchedLookupTableIndexes) {
        logger.warn(ns('address table lookup counts do not match the loaded addresses'), { signature });
    }

    validateInnerInstructionIntegrity(instructions, innerInstructions, allKeys.length);

    const { numRequiredSignatures, numReadonlySignedAccounts, numReadonlyUnsignedAccounts } = header;

    const computeUnitsConsumed = meta ? asSafeNumeric(meta.computeUnitsConsumed ?? null) : null;
    const logMessages = meta?.logMessages ? Array.from(meta.logMessages) : null;

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
        resolvedAccounts: [...transaction.accounts],
        signature,
        slot,
        version: reportedVersion,
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
