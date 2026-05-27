import type { ParsedInstruction, PublicKey, TransactionInstruction } from '@solana/web3.js';

import type { KitInstruction } from '@/app/shared/lib/web3js-compat';

export interface ParsedInstructionInfo<T extends string = string, I = unknown> {
    type: T;
    info: I;
}

/**
 * Parser is registered for the program but couldn't decode the discriminator.
 * Callers can branch on `programLabel` to render a program-aware fallback
 * (e.g. MPL's "Unknown Instruction" card) instead of the generic Unknown.
 */
export interface DispatchUnknown {
    unknown: true;
    programLabel: string;
    programId: PublicKey;
}

export type DispatchResult = ParsedInstruction | DispatchUnknown;

export function isParsedInstruction(result: DispatchResult | undefined): result is ParsedInstruction {
    return result !== undefined && !('unknown' in result);
}

/**
 * `P` is the slice's canonical shape — usually a discriminated union like
 * `{ type: 'transfer'; info: TransferInfo } | { type: 'createAccount'; info: ... }`
 * so consumers get exhaustive narrowing via `switch (parsed.type)`.
 */
export interface InstructionParser<P extends ParsedInstructionInfo = ParsedInstructionInfo> {
    programId: string;
    /** Matches the RPC `program` field, e.g. 'system', 'spl-token'. */
    programLabel: string;
    /** Takes KitInstruction (not TransactionInstruction) — dispatcher converts once at its entry. */
    fromTransaction(ix: KitInstruction): P | undefined;
    /** Omit for programs RPC does not pre-parse. */
    fromParsed?(ix: ParsedInstruction): P | undefined;
}

export interface InstructionParserDispatcher {
    /** `undefined` → no parser registered. `DispatchUnknown` → registered but discriminator failed. */
    fromTransactionInstruction(ix: TransactionInstruction): DispatchResult | undefined;
    /** Passes through unchanged when no slice handles the program. */
    fromParsedInstruction(ix: ParsedInstruction): ParsedInstruction;
    getInstructionParser(programId: string): InstructionParser | undefined;
}
