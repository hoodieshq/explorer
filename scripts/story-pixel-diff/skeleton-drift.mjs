#!/usr/bin/env node
// Capture the 3 pulsing-skeleton stories twice with all CSS animations/transitions disabled,
// then byte-compare to confirm the diff was pure animation noise.

import { createHash } from 'node:crypto';
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, 'skeleton-frozen');
await mkdir(outDir, { recursive: true });

const ids = [
    'components-shared-ui-skeletons--rich-row',
    'components-shared-ui-skeletons--stats-table',
    'components-shared-ui-skeletons--table-card-custom',
];

// Injected before any page script — fully removes animations & transitions.
const freezeCss = `
*, *::before, *::after {
    animation: none !important;
    transition: none !important;
    caret-color: transparent !important;
}
`;
const freezeScript = `
(() => {
    const inject = () => {
        if (document.getElementById('__freeze__')) return;
        const style = document.createElement('style');
        style.id = '__freeze__';
        style.textContent = ${JSON.stringify(freezeCss)};
        (document.head || document.documentElement).appendChild(style);
    };
    inject();
    new MutationObserver(inject).observe(document.documentElement, { childList: true, subtree: true });
})();
`;

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.addInitScript(freezeScript);

async function loadStory(id) {
    const url = `http://localhost:6006/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
    await page.goto(url, { waitUntil: 'load' });
    await page
        .waitForFunction(
            () => {
                const root = document.querySelector('#storybook-root, #root');
                return root && (root.children.length > 0 || root.textContent.length > 0);
            },
            { timeout: 10000 },
        )
        .catch(() => {});
    await page.waitForTimeout(500);
}

async function shoot(id, run) {
    const path = `${outDir}/${id}__run${run}.png`;
    await page.screenshot({ path, fullPage: false });
    return path;
}

const hash = async p =>
    createHash('sha256')
        .update(await readFile(p))
        .digest('hex');

const results = [];
for (const id of ids) {
    // Strategy A: same load, two screenshots back-to-back — isolates pure render-frame variance.
    await loadStory(id);
    const a1 = await shoot(id, 'sameload-1');
    await page.waitForTimeout(200);
    const a2 = await shoot(id, 'sameload-2');
    const [ha1, ha2] = await Promise.all([hash(a1), hash(a2)]);

    // Strategy B: two independent loads — captures full-cycle non-determinism.
    await loadStory(id);
    const b1 = await shoot(id, 'reload-1');
    await loadStory(id);
    const b2 = await shoot(id, 'reload-2');
    const [hb1, hb2] = await Promise.all([hash(b1), hash(b2)]);

    results.push({
        id,
        sameLoad: { a1: ha1.slice(0, 12), a2: ha2.slice(0, 12), identical: ha1 === ha2 },
        reload: { b1: hb1.slice(0, 12), b2: hb2.slice(0, 12), identical: hb1 === hb2 },
    });
}

await browser.close();
console.log('frozen-animation capture results:');
for (const r of results) console.log(JSON.stringify(r, undefined, 2));
const sameLoadStable = results.every(r => r.sameLoad.identical);
const reloadStable = results.every(r => r.reload.identical);
console.log(`\nsame-load (2 shots, no nav): ${sameLoadStable ? 'STABLE' : 'differs'}`);
console.log(`reload-cycle (full reload between shots): ${reloadStable ? 'STABLE' : 'differs'}`);
console.log('\ninterpretation:');
if (sameLoadStable && !reloadStable)
    console.log('  render is stable once loaded; non-determinism is in the load/hydration path');
else if (!sameLoadStable)
    console.log(
        '  even same-load shots differ → ongoing redraws beyond CSS animations (likely React re-renders or remaining JS work)',
    );
else console.log('  fully deterministic → original "flaky" diff was 100% CSS-animation timing');
