import type { Address } from '@solana/kit';

/**
 * One instruction as `formatInstructionLogs` takes it: its program, plus display names when the caller
 * resolved them. `programId` is a kit `Address` - a caller holding a web3.js `PublicKey` converts with
 * `toKitAddress` at its own boundary, so this entity depends on no key representation.
 *
 * Rows must stay in transaction order and must not be filtered. `formatInstructionLogs` pairs row `i`
 * with the `i`th top-level invocation in the logs, so dropping a row shifts every later one onto
 * another instruction's CU figure.
 */
export type InstructionCUInput = {
    programId: Address;
    name?: string;
    programName?: string;
};

export type InstructionCUData = {
    // A plain string: this is opaque display data, carried through rather than read as an address again.
    programId: string;
    // What the logs reported. 0 means the logs said nothing, not that the instruction consumed nothing.
    computeUnits: number;
    // A builtin's fixed cost, and 0 for any program that is not a builtin. A real cost rather than a
    // guess, so `toInstructionCUDisplay` does not mark it an estimate.
    defaultUnits: number;
    // The schedule's reserve for this program at this epoch - a guess, so the card prefixes it with ~.
    // Absent under v1: it budgets the message as a whole and reserves nothing per instruction.
    scheduledUnits?: number;
    // Resolved display names, when the caller knows them: the instruction name ("Transfer Checked") and
    // the program's display name ("Token Program"). Undefined when nothing named it — see
    // toInstructionCUDisplay for what the card shows instead.
    name?: string;
    programName?: string;
};
