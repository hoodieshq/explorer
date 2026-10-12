import { describe, expect, it } from 'vitest';

import { surfaceOf } from '../idl-surfaces';

describe('surfaceOf', () => {
    it.each([
        ['/tx/5abc', 'transaction'],
        ['/tx/5abc/inspect', 'inspector'],
        ['/tx/inspector', 'inspector'],
        ['/address/devi51/idl', 'idl-tab'],
        ['/address/devi51', 'account'],
        ['/address/H59M/anchor-account', 'account'],
        ['/block/1', undefined],
        ['/', undefined],
    ])('should map %s to %s', (pathname, surface) => {
        expect(surfaceOf(pathname)).toBe(surface);
    });
});
