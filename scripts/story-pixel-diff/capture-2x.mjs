import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { chromium } from 'playwright';

const outDir = resolve(process.argv[2]);
const idsFile = resolve(process.argv[3]);
const baseUrl = process.env.STORYBOOK_URL ?? 'http://localhost:6006';

await mkdir(outDir, { recursive: true });
const ids = JSON.parse(await readFile(idsFile, 'utf8'));
console.log(`[capture-2x] ${ids.length} stories @ 2x DPR → ${outDir}`);

const browser = await chromium.launch({ headless: true });
// reducedMotion freezes animate-pulse skeletons etc. so captures don't depend on animation phase
const ctx = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
});
const page = await ctx.newPage();

for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const url = `${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        await page
            .waitForFunction(
                () => {
                    const r = document.querySelector('#storybook-root, #root');
                    return r && (r.children.length > 0 || r.textContent.length > 0);
                },
                { timeout: 10000 },
            )
            .catch(() => {});
        // 1500ms: async stories (SWR fetches, verified-build checks) need time to settle past transitional Loading states
        await page.waitForTimeout(1500);
        // pin all CSS animations/transitions to a deterministic frame — reducedMotion alone doesn't stop animate-spin
        await page
            .addStyleTag({
                content:
                    '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}',
            })
            .catch(() => {});
        await page.waitForTimeout(100);
        await page.screenshot({ path: `${outDir}/${id}.png`, fullPage: false });
    } catch (e) {
        console.error(`fail ${id}: ${e.message}`);
    }
}
await browser.close();
console.log('[capture-2x] done');
