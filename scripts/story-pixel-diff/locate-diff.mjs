import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(`${__dirname}/.diff-tools/`);
const { PNG } = require('pngjs');

const [, , baselinePath, afterPath] = process.argv;
const a = PNG.sync.read(readFileSync(resolve(baselinePath)));
const b = PNG.sync.read(readFileSync(resolve(afterPath)));

let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
let count = 0;
const threshold = 13; // ~5% of 255
for (let y = 0; y < a.height; y++) {
    for (let x = 0; x < a.width; x++) {
        const idx = (y * a.width + x) * 4;
        const dr = Math.abs(a.data[idx] - b.data[idx]);
        const dg = Math.abs(a.data[idx + 1] - b.data[idx + 1]);
        const db = Math.abs(a.data[idx + 2] - b.data[idx + 2]);
        if (dr > threshold || dg > threshold || db > threshold) {
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
            count++;
        }
    }
}

console.log(
    JSON.stringify(
        { count, bbox: { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 } },
        undefined,
        2,
    ),
);
