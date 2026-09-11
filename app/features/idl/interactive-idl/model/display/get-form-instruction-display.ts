import type { FetchAccountFn, InstructionDisplay } from '@codama/dynamic-instructions';

import { normalizeAccounts } from '../codama/normalize-accounts';
import { populateAccounts, populateArguments } from '../idl-executor';
import type { UnifiedProgram } from '../unified-program.d';
import { flattenNestedRecord, type InstructionFormData } from '../use-instruction-form';

/**
 * Resolve the display for an instruction from raw form values.
 *
 * Takes the same route as execution — flatten, populate, normalize — so the preview describes the
 * instruction that would actually be sent. Rejects on a half-filled or malformed form; deciding
 * whether that is worth showing belongs to the caller.
 * Undefined when the program's IDL standard cannot carry display metadata at all.
 */
export async function getFormInstructionDisplay({
    program,
    instructionName,
    values,
    fetchAccount,
}: {
    program: UnifiedProgram;
    instructionName: string;
    values: InstructionFormData;
    fetchAccount?: FetchAccountFn;
}): Promise<InstructionDisplay | undefined> {
    if (!program.getInstructionDisplay) return undefined;

    const accounts = normalizeAccounts(
        populateAccounts(flattenNestedRecord(values.accounts), instructionName) as Record<string, string>,
    );
    const args = populateArguments(flattenNestedRecord(values.arguments), instructionName);

    return program.getInstructionDisplay(instructionName, accounts, args, { fetchAccount });
}
