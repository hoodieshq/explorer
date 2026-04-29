/**
 * Canonical English labels for the Anchor IDL instruction enum. Lives in lib/
 * rather than ui/ because these names ("Set Authority", "Create Buffer") are the
 * standard names for the instruction values, not a UI choice.
 */

import { InstructionType } from './types';

const INSTRUCTION_LABELS: Record<InstructionType, string> = {
    [InstructionType.Close]: 'Close',
    [InstructionType.Create]: 'Create',
    [InstructionType.CreateBuffer]: 'Create Buffer',
    [InstructionType.Resize]: 'Resize',
    [InstructionType.SetAuthority]: 'Set Authority',
    [InstructionType.SetBuffer]: 'Set Buffer',
    [InstructionType.Write]: 'Write',
};

/** Past-tense one-liner for events that don't carry per-event detail to render. */
const INSTRUCTION_SUMMARIES: Partial<Record<InstructionType, string>> = {
    [InstructionType.Close]: 'Account closed',
    [InstructionType.Create]: 'IDL account created',
    [InstructionType.CreateBuffer]: 'Buffer account created',
    [InstructionType.SetBuffer]: 'Buffer copied to IDL',
};

export function getInstructionLabel(type: InstructionType): string {
    return INSTRUCTION_LABELS[type];
}

export function getInstructionSummary(type: InstructionType): string | undefined {
    return INSTRUCTION_SUMMARIES[type];
}
