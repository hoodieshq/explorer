import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PNG } from 'pngjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { diffDirectories, loadAllowlists } from './diff.js';

const TMP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '.tmp');

function makePng(width: number, height: number, rgb: [number, number, number], hotPixels = 0): Buffer {
    const png = new PNG({ height, width });
    for (let i = 0; i < width * height; i++) {
        const offset = i * 4;
        const hot = i < hotPixels;
        png.data[offset] = hot ? 255 - rgb[0] : rgb[0];
        png.data[offset + 1] = rgb[1];
        png.data[offset + 2] = rgb[2];
        png.data[offset + 3] = 255;
    }
    return PNG.sync.write(png);
}

describe('diffDirectories', () => {
    let root: string;
    let baselineDir: string;
    let currentDir: string;

    beforeEach(() => {
        mkdirSync(TMP_ROOT, { recursive: true });
        root = mkdtempSync(join(TMP_ROOT, 'diff-'));
        baselineDir = join(root, 'baseline');
        currentDir = join(root, 'current');
        mkdirSync(baselineDir);
        mkdirSync(currentDir);
    });

    afterEach(() => {
        rmSync(root, { force: true, recursive: true });
    });

    const writeStory = (dir: string, id: string, png: Buffer) => writeFileSync(join(dir, `${id}.png`), png);

    it('should report zero drift for identical directories', () => {
        const png = makePng(4, 4, [10, 20, 30]);
        writeStory(baselineDir, 'story-a', png);
        writeStory(currentDir, 'story-a', png);

        const result = diffDirectories({ baselineDir, currentDir });

        expect(result.compared).toBe(1);
        expect(result.drift).toEqual([]);
        expect(result.allowedDrift).toEqual([]);
    });

    it('should report drifted stories sorted by pixel count', () => {
        writeStory(baselineDir, 'story-small', makePng(4, 4, [10, 20, 30]));
        writeStory(currentDir, 'story-small', makePng(4, 4, [10, 20, 30], 1));
        writeStory(baselineDir, 'story-big', makePng(4, 4, [10, 20, 30]));
        writeStory(currentDir, 'story-big', makePng(4, 4, [10, 20, 30], 8));

        const result = diffDirectories({ baselineDir, currentDir });

        expect(result.drift.map(entry => entry.id)).toEqual(['story-big', 'story-small']);
        expect(result.drift[0].pixels).toBe(8);
        expect(result.drift[0].pct).toBe(50);
    });

    it('should bucket allowlisted drift separately without failing signal', () => {
        writeStory(baselineDir, 'story-flaky', makePng(4, 4, [10, 20, 30]));
        writeStory(currentDir, 'story-flaky', makePng(4, 4, [10, 20, 30], 4));

        const result = diffDirectories({ allowlist: new Set(['story-flaky']), baselineDir, currentDir });

        expect(result.drift).toEqual([]);
        expect(result.allowedDrift.map(entry => entry.id)).toEqual(['story-flaky']);
    });

    it('should flag dimension mismatches as drift with pixels -1', () => {
        writeStory(baselineDir, 'story-a', makePng(4, 4, [10, 20, 30]));
        writeStory(currentDir, 'story-a', makePng(4, 8, [10, 20, 30]));

        const result = diffDirectories({ baselineDir, currentDir });

        expect(result.drift).toEqual([{ id: 'story-a', pct: 0, pixels: -1, reason: 'dim-mismatch' }]);
    });

    it('should classify one-sided stories as added or removed, never drift', () => {
        writeStory(baselineDir, 'story-old', makePng(4, 4, [10, 20, 30]));
        writeStory(currentDir, 'story-new', makePng(4, 4, [10, 20, 30]));

        const result = diffDirectories({ baselineDir, currentDir });

        expect(result.compared).toBe(0);
        expect(result.drift).toEqual([]);
        expect(result.added).toEqual(['story-new']);
        expect(result.removed).toEqual(['story-old']);
    });

    it('should ignore non-png files such as baseline-meta.json', () => {
        writeFileSync(join(baselineDir, 'baseline-meta.json'), '{"sha":"abc"}');
        const png = makePng(4, 4, [10, 20, 30]);
        writeStory(baselineDir, 'story-a', png);
        writeStory(currentDir, 'story-a', png);

        const result = diffDirectories({ baselineDir, currentDir });

        expect(result.compared).toBe(1);
        expect(result.removed).toEqual([]);
    });

    it('should write triplets only for non-allowlisted drift', () => {
        const tripletDir = join(root, 'triplets');
        writeStory(baselineDir, 'story-real', makePng(4, 4, [10, 20, 30]));
        writeStory(currentDir, 'story-real', makePng(4, 4, [10, 20, 30], 2));
        writeStory(baselineDir, 'story-flaky', makePng(4, 4, [10, 20, 30]));
        writeStory(currentDir, 'story-flaky', makePng(4, 4, [10, 20, 30], 2));
        writeStory(baselineDir, 'story-clean', makePng(4, 4, [10, 20, 30]));
        writeStory(currentDir, 'story-clean', makePng(4, 4, [10, 20, 30]));

        diffDirectories({ allowlist: new Set(['story-flaky']), baselineDir, currentDir, tripletDir });

        expect(readdirSync(tripletDir).sort()).toEqual([
            'story-real.baseline.png',
            'story-real.current.png',
            'story-real.diff.png',
        ]);
    });

    it('should not create the triplet dir when there is no drift', () => {
        const tripletDir = join(root, 'triplets');
        const png = makePng(4, 4, [10, 20, 30]);
        writeStory(baselineDir, 'story-a', png);
        writeStory(currentDir, 'story-a', png);

        diffDirectories({ baselineDir, currentDir, tripletDir });

        expect(existsSync(tripletDir)).toBe(false);
    });
});

describe('loadAllowlists', () => {
    it('should merge ids across multiple files', () => {
        mkdirSync(TMP_ROOT, { recursive: true });
        const dir = mkdtempSync(join(TMP_ROOT, 'allow-'));
        writeFileSync(join(dir, 'a.json'), JSON.stringify({ ids: ['one', 'two'] }));
        writeFileSync(join(dir, 'b.json'), JSON.stringify({ note: 'no ids key' }));
        writeFileSync(join(dir, 'c.json'), JSON.stringify({ ids: ['two', 'three'] }));

        const merged = loadAllowlists([join(dir, 'a.json'), join(dir, 'b.json'), join(dir, 'c.json')]);

        expect([...merged].sort()).toEqual(['one', 'three', 'two']);
        rmSync(dir, { force: true, recursive: true });
    });
});
