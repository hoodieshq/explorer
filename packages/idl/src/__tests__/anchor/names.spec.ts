import { describe, expect, it } from 'vitest';

import { buildInstructionNameResolver, buildInstructionNameTable, buildProgramName } from '../../names';
import type { AnchorIdl } from '../../types';
import { incrementIx, loadLetMeBuyIdl, loadSimpleIdl } from '../fixtures';

describe('buildProgramName (Anchor)', () => {
    it('should title-case the metadata name', () => {
        expect(buildProgramName(loadSimpleIdl())).toBe('Simple');
        expect(buildProgramName(loadLetMeBuyIdl())).toBe('Let Me Buy');
    });

    it('should return undefined when the IDL does not name the program', () => {
        const simple = loadSimpleIdl();
        const unnamed = { ...simple, metadata: { ...simple.metadata, name: '' } } as AnchorIdl;
        expect(buildProgramName(unnamed)).toBeUndefined();
    });
});

describe('instruction names (Anchor)', () => {
    it('should build entries from explicit discriminator byte arrays', () => {
        const simple = loadSimpleIdl();
        const table = buildInstructionNameTable(simple);
        expect(table).toHaveLength(simple.instructions.length);
        expect(table).toContainEqual({
            discriminator: Uint8Array.from(incrementIx(simple).data.slice(0, 8)),
            name: 'Increment',
        });
    });

    it('should resolve an instruction name from instruction data', () => {
        const simple = loadSimpleIdl();
        const resolve = buildInstructionNameResolver(simple);
        expect(resolve?.(incrementIx(simple).data)).toBe('Increment');
    });

    it('should return undefined when the IDL yields no usable table', () => {
        const noDiscriminators = {
            ...loadSimpleIdl(),
            instructions: [{ accounts: [], args: [], discriminator: [], name: 'bare' }],
        } as AnchorIdl;
        expect(buildInstructionNameResolver(noDiscriminators)).toBeUndefined();
    });
});
