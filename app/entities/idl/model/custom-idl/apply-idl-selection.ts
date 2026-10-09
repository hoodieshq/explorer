import { type ProgramIdlPair } from '../../api/types';
import { getIdlStandard } from '../idl-version';
import { type ProgramIdlPreference } from './custom-idl-store';

export type SelectedProgramIdls = ProgramIdlPair & { isCustomIdl: boolean };

/**
 * Apply a program's IDL preference to its on-chain pair. A selected custom IDL replaces both on-chain
 * sources, so no consumer can fall back to them: it takes the slot of its own standard (Codama in the PMP
 * slot, Anchor in the Anchor slot), which is the slot each decoder already reads that standard from.
 */
export function applyIdlSelection(
    onChain: ProgramIdlPair,
    preference: ProgramIdlPreference | undefined,
): SelectedProgramIdls {
    const custom = preference?.selected === 'custom' ? preference.custom : undefined;
    if (custom) {
        const isCodama = getIdlStandard(custom.idl) === 'Codama';
        return {
            anchorIdl: isCodama ? undefined : custom.idl,
            anchorIdlAddress: undefined,
            isCustomIdl: true,
            programMetadataIdl: isCodama ? custom.idl : undefined,
            programMetadataIdlAddress: undefined,
        };
    }
    if (preference?.selected === 'anchor' && onChain.anchorIdl) {
        return { ...onChain, isCustomIdl: false, programMetadataIdl: undefined, programMetadataIdlAddress: undefined };
    }
    return { ...onChain, isCustomIdl: false };
}
