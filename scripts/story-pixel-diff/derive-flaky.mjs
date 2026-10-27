// Pixel-diffs phase2-baseline/ vs phase2-baseline-2/ (same Storybook process, two consecutive captures)
// and writes the runtime-flaky story IDs to flaky-allowlist.json.

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scratchDir = resolve(__dirname, '.diff-tools');
const require = createRequire(`${scratchDir}/`);
const { PNG } = require('pngjs');
const pmMod = await import(require.resolve('pixelmatch'));
const pixelmatch = pmMod.default ?? pmMod;

const A = resolve(__dirname, 'phase2-baseline');
const B = resolve(__dirname, 'phase2-baseline-2');
const files = readdirSync(A).filter(f => f.endsWith('.png'));

const flaky = [];
for (const f of files) {
    const a = PNG.sync.read(readFileSync(`${A}/${f}`));
    const b = PNG.sync.read(readFileSync(`${B}/${f}`));
    if (a.width !== b.width || a.height !== b.height) {
        // eslint-disable-next-line no-restricted-syntax -- strip the .png suffix to recover the story id
        flaky.push({ id: f.replace(/\.png$/, ''), reason: 'dim-mismatch' });
        continue;
    }
    const diff = new PNG({ width: a.width, height: a.height });
    const px = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.05, includeAA: false });
    // eslint-disable-next-line no-restricted-syntax -- strip the .png suffix to recover the story id
    if (px > 0) flaky.push({ id: f.replace(/\.png$/, ''), pixels: px });
}

flaky.sort((x, y) => (y.pixels ?? 0) - (x.pixels ?? 0));
const ids = flaky.map(x => x.id);
writeFileSync(
    resolve(__dirname, 'flaky-allowlist.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), count: ids.length, ids }, undefined, 2),
);
console.log(`flaky stories: ${flaky.length}`);
for (const f of flaky) console.log(`  ${f.id}${f.pixels ? ` (${f.pixels}px)` : ` [${f.reason}]`}`);
