// Pixel-diffs after/ vs after2/ (same code, two captures).
// Any non-zero pixel diff here = runtime non-determinism inside the story.
// Zero pixel diff with non-zero sha256 diff = pure PNG encoder noise.

import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scratchDir = resolve(__dirname, '.diff-tools');
const require = createRequire(`${scratchDir}/`);
const { PNG } = require('pngjs');
const pmMod = await import(require.resolve('pixelmatch'));
const pixelmatch = pmMod.default ?? pmMod;

const A = resolve(__dirname, 'after');
const B = resolve(__dirname, 'after2');
const files = readdirSync(A).filter(f => f.endsWith('.png'));

let stable = 0; // bytes identical
let encoderNoise = 0; // bytes differ, pixels identical
const runtimeFlaky = []; // pixels differ
for (const f of files) {
    const baA = readFileSync(`${A}/${f}`);
    const baB = readFileSync(`${B}/${f}`);
    const hA = createHash('sha256').update(baA).digest('hex');
    const hB = createHash('sha256').update(baB).digest('hex');
    if (hA === hB) {
        stable++;
        continue;
    }
    const a = PNG.sync.read(baA);
    const b = PNG.sync.read(baB);
    if (a.width !== b.width || a.height !== b.height) {
        // eslint-disable-next-line no-restricted-syntax -- strip the .png suffix to recover the story id
        runtimeFlaky.push({ id: f.replace(/\.png$/, ''), pixels: -1, reason: 'dim-mismatch' });
        continue;
    }
    const diff = new PNG({ width: a.width, height: a.height });
    const px = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.05, includeAA: false });
    if (px === 0) encoderNoise++;
    else
        runtimeFlaky.push({
            // eslint-disable-next-line no-restricted-syntax -- strip the .png suffix to recover the story id
            id: f.replace(/\.png$/, ''),
            pixels: px,
            pct: +((100 * px) / (a.width * a.height)).toFixed(3),
        });
}

runtimeFlaky.sort((x, y) => y.pixels - x.pixels);
console.log(`total: ${files.length}`);
console.log(`byte-identical (truly stable): ${stable}`);
console.log(`pixel-identical, byte-different (PNG encoder noise): ${encoderNoise}`);
console.log(`pixel-different (runtime flaky): ${runtimeFlaky.length}\n`);
if (runtimeFlaky.length) {
    for (const r of runtimeFlaky) console.log(`  ${r.id.padEnd(70)} ${String(r.pixels).padStart(7)}  ${r.pct ?? ''}%`);
}
