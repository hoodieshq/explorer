import { describe, expect, it } from 'vitest';

import type { DiffResult } from './diff.js';
import { summaryMarkdown, summaryText } from './summary.js';

const emptyResult: DiffResult = { added: [], allowedDrift: [], compared: 10, drift: [], removed: [] };

describe('summaryMarkdown', () => {
    it('should render the drift table sorted as given', () => {
        const md = summaryMarkdown({
            ...emptyResult,
            drift: [
                { id: 'story-big', pct: 1.5, pixels: 900 },
                { id: 'story-dim', pct: 0, pixels: -1, reason: 'dim-mismatch' },
            ],
        });

        expect(md).toContain('| `story-big` | 900 | 1.5% |');
        expect(md).toContain('| `story-dim` | dim-mismatch | — |');
        expect(md).toContain('drift **2**');
    });

    it('should warn when the baseline commit differs from the merge-base', () => {
        const md = summaryMarkdown(emptyResult, {
            mergeBase: 'bbbbbbbbbbbbbbbbbbbb',
            meta: { capturedAt: '2026-07-24', sha: 'aaaaaaaaaaaaaaaaaaaa' },
        });

        expect(md).toContain('approximate baseline');
        expect(md).toContain('`aaaaaaaaa`');
        expect(md).toContain('`bbbbbbbbb`');
    });

    it('should not warn when the baseline commit matches the merge-base', () => {
        const md = summaryMarkdown(emptyResult, {
            mergeBase: 'aaaaaaaaaaaaaaaaaaaa',
            meta: { sha: 'aaaaaaaaaaaaaaaaaaaa' },
        });

        expect(md).not.toContain('approximate baseline');
    });

    it('should list added and removed stories as info sections', () => {
        const md = summaryMarkdown({ ...emptyResult, added: ['story-new'], removed: ['story-gone'] });

        expect(md).toContain('New stories (no baseline) (1)');
        expect(md).toContain('- `story-new`');
        expect(md).toContain('Removed stories (baseline only) (1)');
    });
});

describe('summaryText', () => {
    it('should report counts and drifted stories', () => {
        const text = summaryText({ ...emptyResult, drift: [{ id: 'story-a', pct: 0.1, pixels: 12 }] });

        expect(text).toContain('drift (outside allowlists): 1');
        expect(text).toContain('story-a');
    });
});
