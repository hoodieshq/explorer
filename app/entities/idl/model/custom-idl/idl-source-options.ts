import { type ProgramIdlPair } from '../../api/types';
import { type IdlSourceSelection, type ProgramIdlPreference } from './custom-idl-store';

export type IdlSourceOption = 'programMetadata' | 'anchor' | 'custom';
export type OnChainIdlSourceOption = Exclude<IdlSourceOption, 'custom'>;

/** On-chain sources the program has, PMP first to match the default resolution order. */
export function getOnChainIdlSourceOptions(onChain: ProgramIdlPair): OnChainIdlSourceOption[] {
    const options: OnChainIdlSourceOption[] = [];
    if (onChain.programMetadataIdl) options.push('programMetadata');
    if (onChain.anchorIdl) options.push('anchor');
    return options;
}

/** The source the program resolves to under its preference, mirroring `applyIdlSelection`. */
export function getSelectedIdlSourceOption(
    onChain: ProgramIdlPair,
    preference: ProgramIdlPreference | undefined,
): IdlSourceOption | undefined {
    if (preference?.selected === 'custom' && preference.custom) return 'custom';
    if (preference?.selected === 'anchor' && onChain.anchorIdl) return 'anchor';
    if (onChain.programMetadataIdl) return 'programMetadata';
    if (onChain.anchorIdl) return 'anchor';
    return undefined;
}

/**
 * The stored selection for an option. The default policy already picks PMP, and Anchor when it is the only
 * on-chain source, so those store nothing and keep following the chain if the program publishes a PMP IDL.
 */
export function toIdlSourceSelection(option: IdlSourceOption, onChain: ProgramIdlPair): IdlSourceSelection | undefined {
    if (option === 'custom') return 'custom';
    if (option === 'anchor' && onChain.programMetadataIdl) return 'anchor';
    return undefined;
}
