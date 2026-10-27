// Side-by-side (before|after) bbox crops for drifted stories → <outDir>/<id>.png
// Usage: node gen-acceptance-diffs.mjs <drift-ids.json> [beforeDir] [afterDir] [outDir]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(`${__dirname}/.diff-tools/`);
const { PNG } = require('pngjs');

const ids = JSON.parse(readFileSync(resolve(process.argv[2]), 'utf8'));
const beforeDir = resolve(__dirname, process.argv[3] ?? 'master-before-2x');
const afterDir = resolve(__dirname, process.argv[4] ?? 'master-after-2x');
const outDir = resolve(__dirname, process.argv[5] ?? 'master-diff-2x');
mkdirSync(outDir, { recursive: true });

const PAD = 48;
for (const id of ids) {
    let a, b;
    try {
        a = PNG.sync.read(readFileSync(`${beforeDir}/${id}.png`));
        b = PNG.sync.read(readFileSync(`${afterDir}/${id}.png`));
    } catch (e) {
        console.error(`skip ${id}: ${e.message}`);
        continue;
    }
    let minX = Infinity,
        maxX = -1,
        minY = Infinity,
        maxY = -1;
    const t = 13;
    for (let y = 0; y < a.height; y++) {
        for (let x = 0; x < a.width; x++) {
            const i = (y * a.width + x) * 4;
            if (
                Math.abs(a.data[i] - b.data[i]) > t ||
                Math.abs(a.data[i + 1] - b.data[i + 1]) > t ||
                Math.abs(a.data[i + 2] - b.data[i + 2]) > t
            ) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) continue;
    const x0 = Math.max(0, minX - PAD),
        x1 = Math.min(a.width - 1, maxX + PAD);
    const y0 = Math.max(0, minY - PAD),
        y1 = Math.min(a.height - 1, maxY + PAD);
    const w = x1 - x0 + 1,
        h = y1 - y0 + 1,
        gap = 8;
    const out = new PNG({ width: w * 2 + gap, height: h });
    out.data.fill(255);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const src = ((y + y0) * a.width + (x + x0)) * 4;
            const dl = (y * out.width + x) * 4;
            const dr = (y * out.width + x + w + gap) * 4;
            for (let c = 0; c < 4; c++) {
                out.data[dl + c] = a.data[src + c];
                out.data[dr + c] = b.data[src + c];
            }
        }
    }
    writeFileSync(`${outDir}/${id}.png`, PNG.sync.write(out));
}
console.log('done');
