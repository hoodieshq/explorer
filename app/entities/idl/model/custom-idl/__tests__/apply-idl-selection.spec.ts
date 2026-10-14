import { describe, expect, it } from 'vitest';

import { type ProgramIdlPair } from '../../../api/types';
import { type SupportedIdl } from '../../../lib/types';
import { applyIdlSelection } from '../apply-idl-selection';
import { getOnChainIdlSourceOptions, getSelectedIdlSourceOption, toIdlSourceSelection } from '../idl-source-options';

const PROGRAM = 'AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye';
const anchorIdl = { address: PROGRAM, instructions: [], metadata: { spec: '0.1.0' } } as unknown as SupportedIdl;
const pmpIdl = { kind: 'rootNode', program: { publicKey: PROGRAM }, standard: 'codama' } as unknown as SupportedIdl;
const customAnchor = {
    address: PROGRAM,
    instructions: [],
    metadata: { name: 'mine', spec: '0.1.0' },
} as unknown as SupportedIdl;
const customCodama = {
    kind: 'rootNode',
    program: { name: 'mine', publicKey: PROGRAM },
    standard: 'codama',
} as unknown as SupportedIdl;

const onChain: ProgramIdlPair = {
    anchorIdl,
    anchorIdlAddress: 'anchor-pda',
    programMetadataIdl: pmpIdl,
    programMetadataIdlAddress: 'pmp-account',
};

describe('applyIdlSelection', () => {
    it('should return the on-chain pair when there is no preference', () => {
        expect(applyIdlSelection(onChain, undefined)).toEqual({ ...onChain, isCustomIdl: false });
    });

    it('should replace both on-chain sources with a custom Anchor IDL', () => {
        expect(applyIdlSelection(onChain, { custom: { addedAt: 1, idl: customAnchor }, selected: 'custom' })).toEqual({
            anchorIdl: customAnchor,
            anchorIdlAddress: undefined,
            isCustomIdl: true,
            programMetadataIdl: undefined,
            programMetadataIdlAddress: undefined,
        });
    });

    it('should put a custom Codama IDL in the PMP slot', () => {
        const result = applyIdlSelection(onChain, { custom: { addedAt: 1, idl: customCodama }, selected: 'custom' });
        expect(result.programMetadataIdl).toBe(customCodama);
        expect(result.anchorIdl).toBeUndefined();
    });

    it('should keep the on-chain pair when the custom IDL is stored but not selected', () => {
        expect(applyIdlSelection(onChain, { custom: { addedAt: 1, idl: customAnchor } }).isCustomIdl).toBe(false);
    });

    it('should hide the PMP IDL when the user picks Anchor', () => {
        const result = applyIdlSelection(onChain, { selected: 'anchor' });
        expect(result.programMetadataIdl).toBeUndefined();
        expect(result.anchorIdl).toBe(anchorIdl);
    });
});

describe('IDL source options', () => {
    it('should list the on-chain sources PMP first', () => {
        expect(getOnChainIdlSourceOptions(onChain)).toEqual(['programMetadata', 'anchor']);
        expect(getOnChainIdlSourceOptions({ ...onChain, programMetadataIdl: undefined })).toEqual(['anchor']);
    });

    it('should report the source each preference resolves to', () => {
        expect(getSelectedIdlSourceOption(onChain, undefined)).toBe('programMetadata');
        expect(getSelectedIdlSourceOption(onChain, { selected: 'anchor' })).toBe('anchor');
        expect(
            getSelectedIdlSourceOption(onChain, { custom: { addedAt: 1, idl: customAnchor }, selected: 'custom' }),
        ).toBe('custom');
        expect(getSelectedIdlSourceOption({ ...onChain, programMetadataIdl: undefined }, undefined)).toBe('anchor');
    });

    it('should store nothing for the source the default policy already picks', () => {
        expect(toIdlSourceSelection('programMetadata', onChain)).toBeUndefined();
        expect(toIdlSourceSelection('anchor', onChain)).toBe('anchor');
        expect(toIdlSourceSelection('anchor', { ...onChain, programMetadataIdl: undefined })).toBeUndefined();
        expect(toIdlSourceSelection('custom', onChain)).toBe('custom');
    });
});
