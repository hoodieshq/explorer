// Confirms whether "flaky" skeleton diffs are real visual diffs or PNG-encoding noise.
// Compares baseline vs after for each of the 3 skeleton stories using pixelmatch.

import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scratchDir = resolve(__dirname, '.diff-tools');
const require = createRequire(`${scratchDir}/`);
const { PNG } = require('pngjs');
const pmMod = await import(require.resolve('pixelmatch'));
const pixelmatch = pmMod.default ?? pmMod;

const stories = [
    'components-shared-ui-skeletons--rich-row',
    'components-shared-ui-skeletons--stats-table',
    'components-shared-ui-skeletons--table-card-custom',
];
const baselineDir = resolve(__dirname, 'baseline');
const afterDir = resolve(__dirname, 'after');

for (const id of stories) {
    const a = PNG.sync.read(readFileSync(`${baselineDir}/${id}.png`));
    const b = PNG.sync.read(readFileSync(`${afterDir}/${id}.png`));
    const diff = new PNG({ width: a.width, height: a.height });
    const px = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.05, includeAA: false });
    const pct = ((100 * px) / (a.width * a.height)).toFixed(3);
    console.log(`${id.padEnd(60)} : ${String(px).padStart(7)} px (${pct}%)`);
}
