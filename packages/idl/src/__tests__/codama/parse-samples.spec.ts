// Executable documentation of the Codama decode wiring Pieces A/B will productize (mcp-endpoint Steps 5/6).
import { parseInstruction } from '@codama/dynamic-parsers';
import { getLastNodeFromPath } from 'codama';
import { describe, expect, it } from 'vitest';

import { codamaIdl, codamaTransferIx } from '../fixtures';

describe('Codama parse samples', () => {
    it('should parse a Codama instruction via @codama/dynamic-parsers', () => {
        const parsed = parseInstruction(codamaIdl, codamaTransferIx);

        expect(parsed).toBeDefined();
        expect(parsed && getLastNodeFromPath(parsed.path).name).toBe('transfer');
        expect(parsed?.data).toMatchObject({ amount: 42n });
    });
});
