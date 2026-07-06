import { describe, expect, it } from 'vitest';

import { buildInstructionNameResolver, buildInstructionNameTable, buildProgramName } from '../../names';
import type { AnchorIdl } from '../../types';
import { ANCHOR_INCREMENT_DISCRIMINATOR, anchorIdl, anchorIncrementIx } from '../fixtures';

describe('buildProgramName (Anchor)', () => {
    it('should title-case the metadata name', () => {
        expect(buildProgramName(anchorIdl)).toBe('Counter');
    });

    it('should return undefined when the IDL does not name the program', () => {
        const unnamed = { ...anchorIdl, metadata: { ...anchorIdl.metadata, name: '' } } as AnchorIdl;
        expect(buildProgramName(unnamed)).toBeUndefined();
    });
});

describe('instruction names (Anchor)', () => {
    it('should build entries from explicit discriminator byte arrays', () => {
        expect(buildInstructionNameTable(anchorIdl)).toEqual([
            { discriminator: Uint8Array.from(ANCHOR_INCREMENT_DISCRIMINATOR), name: 'Increment' },
        ]);
    });

    it('should resolve an instruction name from instruction data', () => {
        const resolve = buildInstructionNameResolver(anchorIdl);
        expect(resolve?.(anchorIncrementIx.data)).toBe('Increment');
    });

    it('should return undefined when the IDL yields no usable table', () => {
        const noDiscriminators = {
            ...anchorIdl,
            instructions: [{ accounts: [], args: [], discriminator: [], name: 'bare' }],
        } as AnchorIdl;
        expect(buildInstructionNameResolver(noDiscriminators)).toBeUndefined();
    });
});
