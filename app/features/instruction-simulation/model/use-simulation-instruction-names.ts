import type { InstructionCUInput } from '@entities/compute-unit';
import { type NamedInstruction, resolveNamesFromData } from '@entities/transaction-data';
import { useResolvedInstructionNames } from '@entities/transaction-data/client';
import { toKitAddress, toLegacyPublicKey } from '@explorer/parsers/compat';
import type { ParsedTransaction, RawInstruction } from '@explorer/parsers/transaction';
import { useMemo } from 'react';

/**
 * One row per simulated instruction, its program plus whatever names resolve, ready for `formatInstructionLogs`.
 *
 * A message queued for simulation is never RPC-parsed, so every name comes from the raw instruction
 * data: Compute Budget and the built-in discriminator resolvers synchronously, IDL-derived names once
 * the per-program fetch lands. Names resolve here rather than in the card so the card stays props-driven.
 */
export function useSimulationInstructionNames(
    transaction: ParsedTransaction<RawInstruction> | undefined,
): InstructionCUInput[] {
    const rows = useMemo(() => transaction?.instructions.map(toNamedInstruction) ?? [], [transaction]);
    const namedInstructions = useResolvedInstructionNames(rows);

    return useMemo(
        () => namedInstructions.map(({ programId, ...rest }) => ({ ...rest, programId: toKitAddress(programId) })),
        [namedInstructions],
    );
}

function toNamedInstruction(instruction: RawInstruction): NamedInstruction {
    const programId = toLegacyPublicKey(instruction.programAddress);
    return { ...resolveNamesFromData({ data: instruction.data, programId }), programId };
}
