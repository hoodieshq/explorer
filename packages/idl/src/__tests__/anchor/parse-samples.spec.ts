// Executable documentation of the Anchor decode wiring Piece B will productize (mcp-endpoint Step 6).
import { parseInstruction } from '@codama/dynamic-parsers';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { BorshInstructionCoder } from '@coral-xyz/anchor';
import { getLastNodeFromPath } from 'codama';
import { describe, expect, it } from 'vitest';

import type { CodamaIdl } from '../../types';
import { anchorIdl, anchorIncrementIx } from '../fixtures';

describe('Anchor parse samples', () => {
    it('should decode a modern Anchor instruction via BorshInstructionCoder', () => {
        const coder = new BorshInstructionCoder(anchorIdl);
        const decoded = coder.decode(Buffer.from(anchorIncrementIx.data));

        expect(decoded?.name).toBe('increment');
        const args = decoded?.data as { amount: unknown } | undefined;
        expect(String(args?.amount)).toBe('42');
    });

    it('should parse the same instruction through the Codama conversion route', () => {
        // nodes-from-anchor ships its own (narrower) Anchor IDL type — same cast the app uses.
        const root = rootNodeFromAnchor(anchorIdl as Parameters<typeof rootNodeFromAnchor>[0]) as unknown as CodamaIdl;
        const parsed = parseInstruction(root, anchorIncrementIx);

        expect(parsed).toBeDefined();
        expect(parsed && getLastNodeFromPath(parsed.path).name).toBe('increment');
        expect(parsed?.data).toMatchObject({ amount: 42n });
    });
});
