// Conversion sweep over every committed Anchor fixture — guards the nodes-from-anchor route
// (including the patched v0.1 alias behaviour) against fixture and dependency drift: every
// anchor document dropped into __fixtures__ must convert.
import { readdirSync, readFileSync } from 'node:fs';

import { type AnchorIdl } from '@explorer/idl';
import { convertToCodama } from '@explorer/idl/anchor';
import { describe, expect, it } from 'vitest';

import { unwrap } from '../../src/__tests__/unwrap';

const FIXTURES_DIR = new URL('../../__fixtures__/', import.meta.url);

const isCodamaRoot = (doc: unknown): boolean =>
    typeof doc === 'object' && doc !== null && 'kind' in doc && doc.kind === 'rootNode';

const anchorDocuments = readdirSync(FIXTURES_DIR)
    .filter(name => name.endsWith('.json'))
    .map(name => ({ doc: JSON.parse(readFileSync(new URL(name, FIXTURES_DIR), 'utf8')) as unknown, name }))
    .filter(({ doc }) => !isCodamaRoot(doc));

describe('Anchor fixture conversion sweep', () => {
    it('should discover anchor documents among the fixtures', () => {
        expect(anchorDocuments.length).toBeGreaterThan(0);
    });

    // legacy (v0.0) documents ride the same cast the runtime route uses
    it.each(anchorDocuments)('should convert $name with nodes-from-anchor', ({ doc }) => {
        const root = unwrap(convertToCodama(doc as AnchorIdl));

        expect(root.program.instructions.length).toBeGreaterThan(0);
    });
});
