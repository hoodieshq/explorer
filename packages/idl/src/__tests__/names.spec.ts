// Standard-agnostic matcher behavior; the per-standard table builders live in anchor/ and codama/.
import { describe, expect, it } from 'vitest';

import { matchInstructionName } from '../names';

describe('matchInstructionName', () => {
    it('should prefer the longest matching prefix', () => {
        const table = [
            { discriminator: Uint8Array.from([1]), name: 'Short' },
            { discriminator: Uint8Array.from([1, 2]), name: 'Long' },
        ];
        expect(matchInstructionName(table, Uint8Array.from([1, 2, 3]))).toBe('Long');
    });

    it('should return undefined when nothing matches', () => {
        const table = [{ discriminator: Uint8Array.from([9]), name: 'Nope' }];
        expect(matchInstructionName(table, Uint8Array.from([1, 2]))).toBeUndefined();
    });

    it('should skip empty discriminators instead of matching everything', () => {
        const table = [{ discriminator: new Uint8Array(), name: 'CatchAll' }];
        expect(matchInstructionName(table, Uint8Array.from([1]))).toBeUndefined();
    });
});
