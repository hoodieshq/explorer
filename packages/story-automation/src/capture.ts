import { mkdir } from 'node:fs/promises';

import { chromium, type Page } from 'playwright';

export interface CaptureOptions {
    baseUrl: string;
    ids: string[];
    outDir: string;
    parallel: number;
    log?: (line: string) => void;
}

export interface CaptureResult {
    captured: number;
    failed: string[];
}

const VIEWPORT = { height: 768, width: 1024 };
// pins all CSS animations/transitions to a deterministic frame — reducedMotion alone doesn't stop animate-spin
const FREEZE_CSS =
    '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}';

async function captureStory(page: Page, baseUrl: string, id: string, outDir: string): Promise<void> {
    const url = `${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
    await page.goto(url, { timeout: 20000, waitUntil: 'load' });
    await page
        .waitForFunction(
            () => {
                const root = document.querySelector('#storybook-root, #root');
                return !!root && (root.children.length > 0 || (root.textContent ?? '').length > 0);
            },
            { timeout: 10000 },
        )
        .catch(() => {});
    // 1500ms: async stories (SWR fetches, verified-build checks) need time to settle past transitional Loading states
    await page.waitForTimeout(1500);
    await page.addStyleTag({ content: FREEZE_CSS }).catch(() => {});
    await page.waitForTimeout(100);
    await page.screenshot({ fullPage: false, path: `${outDir}/${id}.png` });
}

/**
 * Captures each story's iframe at 2x DPR into `outDir/<id>.png`.
 * Per-story failures are collected, not fatal.
 */
export async function captureStories(options: CaptureOptions): Promise<CaptureResult> {
    const { baseUrl, ids, outDir, parallel, log = () => {} } = options;
    await mkdir(outDir, { recursive: true });
    const browser = await chromium.launch({ headless: true });
    // reducedMotion freezes animate-pulse skeletons etc. so captures don't depend on animation phase
    const ctx = await browser.newContext({ deviceScaleFactor: 2, reducedMotion: 'reduce', viewport: VIEWPORT });

    const failed: string[] = [];
    let nextIndex = 0;
    let done = 0;
    const worker = async () => {
        const page = await ctx.newPage();
        while (nextIndex < ids.length) {
            const id = ids[nextIndex++];
            try {
                await captureStory(page, baseUrl, id, outDir);
            } catch (error) {
                failed.push(id);
                log(`fail ${id}: ${error instanceof Error ? error.message : String(error)}`);
            }
            done++;
            if (done % 100 === 0) log(`${done}/${ids.length}`);
        }
        await page.close();
    };

    const workerCount = Math.max(1, Math.min(parallel, ids.length));
    await Promise.all(Array.from({ length: workerCount }, worker));
    await browser.close();
    return { captured: ids.length - failed.length, failed };
}
