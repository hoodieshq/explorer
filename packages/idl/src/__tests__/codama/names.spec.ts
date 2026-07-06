import { describe, expect, it } from 'vitest';

import { buildInstructionNameResolver, buildInstructionNameTable, buildProgramName } from '../../names';
import { codamaIdl, codamaTransferIx } from '../fixtures';

describe('buildProgramName (Codama)', () => {
    it('should title-case the program node name', () => {
        expect(buildProgramName(codamaIdl)).toBe('Token Vault');
    });
});

describe('instruction names (Codama)', () => {
    it('should build entries from constant field discriminators', () => {
        expect(buildInstructionNameTable(codamaIdl)).toEqual([
            { discriminator: Uint8Array.from([3]), name: 'Transfer' },
        ]);
    });

    it('should resolve an instruction name from instruction data', () => {
        const resolve = buildInstructionNameResolver(codamaIdl);
        expect(resolve?.(codamaTransferIx.data)).toBe('Transfer');
    });
});
