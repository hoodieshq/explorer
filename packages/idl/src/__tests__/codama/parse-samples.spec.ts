// Executable documentation of the Codama decode wiring the extraction pieces will productize.
import { parseInstruction } from '@codama/dynamic-parsers';
import { getLastNodeFromPath } from 'codama';
import { describe, expect, it } from 'vitest';

import { loadTokenkegIdl, transferIx } from '../fixtures';

describe('Codama parse samples', () => {
    it('should parse a Codama instruction via @codama/dynamic-parsers', () => {
        const tokenkeg = loadTokenkegIdl();
        const parsed = parseInstruction(tokenkeg, transferIx(tokenkeg));

        expect(parsed).toBeDefined();
        expect(parsed && getLastNodeFromPath(parsed.path).name).toBe('transfer');
        expect(parsed?.data).toMatchObject({ amount: 42n });
    });
});
