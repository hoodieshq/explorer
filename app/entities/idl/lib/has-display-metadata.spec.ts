import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { hasDisplayMetadata } from './has-display-metadata';

function loadIdl(filename: string): unknown {
    const idlPath = path.resolve(__dirname, '../../../features/idl/interactive-idl/model/__mocks__/codama', filename);
    return JSON.parse(readFileSync(idlPath, 'utf8'));
}

describe('hasDisplayMetadata', () => {
    it('should be true for a Codama IDL carrying interpolated intents', () => {
        expect(hasDisplayMetadata(loadIdl('system-program-display-idl.json'))).toBe(true);
    });

    it('should be false for a Codama IDL without display nodes', () => {
        expect(hasDisplayMetadata(loadIdl('system-program-idl.json'))).toBe(false);
    });

    it('should be false for a node that is not a rootNode', () => {
        expect(hasDisplayMetadata({ kind: 'programNode', program: { instructions: [] } })).toBe(false);
    });

    it('should be false for an Anchor IDL', () => {
        expect(hasDisplayMetadata({ address: '11111111111111111111111111111111', instructions: [] })).toBe(false);
    });

    it('should be false when every display node lacks an interpolated intent', () => {
        const idl = {
            kind: 'rootNode',
            program: { instructions: [{ display: { intent: 'Transfer' } }, { display: {} }, {}] },
        };

        expect(hasDisplayMetadata(idl)).toBe(false);
    });

    it('should be false when the interpolated intent is an empty string', () => {
        const idl = { kind: 'rootNode', program: { instructions: [{ display: { interpolatedIntent: '' } }] } };

        expect(hasDisplayMetadata(idl)).toBe(false);
    });

    it('should be false when instructions is not an array', () => {
        expect(hasDisplayMetadata({ kind: 'rootNode', program: { instructions: 'nope' } })).toBe(false);
    });

    it('should be false for undefined, null and primitive input', () => {
        expect(hasDisplayMetadata(undefined)).toBe(false);
        expect(hasDisplayMetadata(null)).toBe(false);
        expect(hasDisplayMetadata('rootNode')).toBe(false);
        expect(hasDisplayMetadata(42)).toBe(false);
        expect(hasDisplayMetadata([])).toBe(false);
    });
});
