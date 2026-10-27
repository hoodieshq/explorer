// Renders pixel diff between two PNGs and reports diff %, plus a diff image if requested.
// Usage: node visual-diff.mjs <pngA> <pngB> [diffOut]
// Self-installs pngjs + pixelmatch into a scratch dir to avoid touching the project lockfile.

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scratchDir = resolve(__dirname, '.diff-tools');
if (!existsSync(`${scratchDir}/node_modules/pngjs`) || !existsSync(`${scratchDir}/node_modules/pixelmatch`)) {
    mkdirSync(scratchDir, { recursive: true });
    writeFileSync(
        `${scratchDir}/package.json`,
        JSON.stringify({ type: 'module', dependencies: { pngjs: '7.0.0', pixelmatch: '7.1.0' } }),
    );
    console.log('[visual-diff] installing pngjs + pixelmatch...');
    execSync('npm install --silent --no-audit --no-fund --prefer-offline', { cwd: scratchDir, stdio: 'inherit' });
}

import { createRequire } from 'node:module';
const require = createRequire(`${scratchDir}/`);
const { PNG } = require('pngjs');
const pmResolved = require.resolve('pixelmatch');
const pmMod = await import(pmResolved);
const pixelmatch = pmMod.default ?? pmMod;

const [pathA, pathB, diffOut] = process.argv.slice(2);
if (!pathA || !pathB) {
    console.error('usage: visual-diff.mjs <pngA> <pngB> [diffOut]');
    process.exit(2);
}

const a = PNG.sync.read(readFileSync(pathA));
const b = PNG.sync.read(readFileSync(pathB));
if (a.width !== b.width || a.height !== b.height) {
    console.error(`dim mismatch: ${a.width}x${a.height} vs ${b.width}x${b.height}`);
    process.exit(1);
}
const diff = new PNG({ width: a.width, height: a.height });
const px = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.05, includeAA: false });
const totalPx = a.width * a.height;
console.log(
    `${pathA.split('/').pop()} vs ${pathB.split('/').pop()}: ${px} of ${totalPx} px differ (${((100 * px) / totalPx).toFixed(3)}%)`,
);
if (diffOut) {
    writeFileSync(diffOut, PNG.sync.write(diff));
    console.log(`diff written → ${diffOut}`);
}
