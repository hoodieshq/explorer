import { describe, expect, it } from 'vitest';

import { buildInstructionNameResolver, buildInstructionNameTable, buildProgramName } from '../../names';
import { loadTokenkegIdl, transferIx } from '../fixtures';

describe('buildProgramName (Codama)', () => {
    it('should title-case the program node name', () => {
        expect(buildProgramName(loadTokenkegIdl())).toBe('Token');
    });
});

describe('instruction names (Codama)', () => {
    it('should build entries from constant field discriminators', () => {
        const table = buildInstructionNameTable(loadTokenkegIdl());
        expect(table.length).toBeGreaterThan(1);
        expect(table).toContainEqual({ discriminator: Uint8Array.from([3]), name: 'Transfer' });
    });

    it('should resolve an instruction name from instruction data', () => {
        const tokenkeg = loadTokenkegIdl();
        const resolve = buildInstructionNameResolver(tokenkeg);
        expect(resolve?.(transferIx(tokenkeg).data)).toBe('Transfer');
    });
});
