// Pixel-diffs every baseline vs after PNG using pixelmatch. Reports per-story diff count.
// Stories listed in flaky-allowlist.json are subtracted by default (intrinsic runtime non-determinism).
// Pass --include-flaky to surface them too.
//
// Usage: node pixel-diff-all.mjs [baselineDir] [afterDir] [--include-flaky]

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scratchDir = resolve(__dirname, '.diff-tools');
const require = createRequire(`${scratchDir}/`);
const { PNG } = require('pngjs');
const pmMod = await import(require.resolve('pixelmatch'));
const pixelmatch = pmMod.default ?? pmMod;

const args = process.argv.slice(2);
const includeFlaky = args.includes('--include-flaky');
// --bg-equiv: user accepted Storybook canvas #161a19 (master) -> #161b19 (branch, matches prod $body-bg)
const bgEquiv = args.includes('--bg-equiv');

function canonicalizeBg(png) {
    const d = png.data;
    for (let i = 0; i < d.length; i += 4) {
        if (d[i] === 22 && d[i + 1] === 26 && d[i + 2] === 25) d[i + 1] = 27;
    }
}
const positional = args.filter(a => !a.startsWith('--'));
const baselineDir = resolve(__dirname, positional[0] ?? 'baseline');
const afterDir = resolve(__dirname, positional[1] ?? 'after');

const flakyPath = resolve(__dirname, 'flaky-allowlist.json');
const flakySet =
    existsSync(flakyPath) && !includeFlaky ? new Set(JSON.parse(readFileSync(flakyPath, 'utf8')).ids) : new Set();

// User-approved intentional deviations from master (story redesigns, bug fixes) — see "reasons" in the JSON.
const intentionalPath = resolve(__dirname, 'intentional-allowlist.json');
const intentionalSet =
    existsSync(intentionalPath) && !includeFlaky
        ? new Set(JSON.parse(readFileSync(intentionalPath, 'utf8')).ids)
        : new Set();
for (const id of intentionalSet) flakySet.add(id);

const files = readdirSync(baselineDir).filter(f => f.endsWith('.png'));
const realDrift = [];
const allowedDrift = [];
let total = 0;
for (const f of files) {
    // eslint-disable-next-line no-restricted-syntax -- strip the .png suffix to recover the story id
    const id = f.replace(/\.png$/, '');
    let a, b;
    try {
        a = PNG.sync.read(readFileSync(`${baselineDir}/${f}`));
        b = PNG.sync.read(readFileSync(`${afterDir}/${f}`));
    } catch (e) {
        console.error(`skip ${f}: ${e.message}`);
        continue;
    }
    total++;
    if (a.width !== b.width || a.height !== b.height) {
        (flakySet.has(id) ? allowedDrift : realDrift).push({ id, reason: 'dim-mismatch', pixels: -1, pct: 0 });
        continue;
    }
    if (bgEquiv) {
        canonicalizeBg(a);
        canonicalizeBg(b);
    }
    const diff = new PNG({ width: a.width, height: a.height });
    const px = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.05, includeAA: false });
    if (px > 0) {
        const pct = (100 * px) / (a.width * a.height);
        const entry = { id, pixels: px, pct: +pct.toFixed(3) };
        (flakySet.has(id) ? allowedDrift : realDrift).push(entry);
    }
}

realDrift.sort((x, y) => y.pixels - x.pixels);
console.log(`baseline: ${baselineDir.split('/').slice(-2).join('/')}`);
console.log(`after:    ${afterDir.split('/').slice(-2).join('/')}`);
console.log(`compared: ${total}`);
console.log(`flaky allowlist: ${flakySet.size} (${includeFlaky ? 'disabled with --include-flaky' : 'subtracted'})`);
console.log(`drift (excluding flaky): ${realDrift.length}`);
if (allowedDrift.length) console.log(`drift inside flaky allowlist: ${allowedDrift.length} (ignored)`);
if (realDrift.length) {
    console.log('\nstory                                                          pixels        %');
    for (const r of realDrift)
        console.log(`  ${r.id.padEnd(60)} ${String(r.pixels).padStart(8)}   ${String(r.pct).padStart(7)}`);
}
