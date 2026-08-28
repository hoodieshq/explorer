import { mkdir } from 'node:fs/promises';

import { type Page } from 'playwright';

import { type BrowserProvider, playwrightProvider } from './browser.js';

export interface CaptureOptions {
    baseUrl: string;
    ids: string[];
    outDir: string;
    parallel: number;
    log?: (line: string) => void;
    provider?: BrowserProvider;
}

export interface CaptureResult {
    captured: number;
    failed: string[];
    /** Captured but never rendered — a blank shot that would otherwise pass as a legitimate baseline. */
    empty: string[];
}

const VIEWPORT = { height: 768, width: 1024 };
// pins all CSS animations/transitions to a deterministic frame — reducedMotion alone doesn't stop animate-spin
const FREEZE_CSS =
    '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition-duration:0s!important;transition-delay:0s!important}';

// A fixed settle alone races CPU contention: at parallel 6 a suspense fallback can still be on screen at
// 1500ms and diffs as drift, while at parallel 1 the same story is stable. So hold for the floor, then wait
// for the DOM to stop changing. CSS animations mutate no nodes, so a frozen skeleton counts as quiet.
const SETTLE_FLOOR_MS = 1500;
const QUIET_MS = 400;
const QUIET_CAP_MS = 6000;

function waitForQuietDom(page: Page): Promise<void> {
    return page.evaluate(
        ([quietMs, capMs]) =>
            new Promise<void>(resolve => {
                const root = document.querySelector('#storybook-root, #root') ?? document.body;
                const observer = new MutationObserver(() => {
                    clearTimeout(quiet);
                    quiet = setTimeout(finish, quietMs);
                });
                const finish = () => {
                    observer.disconnect();
                    clearTimeout(quiet);
                    clearTimeout(cap);
                    resolve();
                };
                let quiet = setTimeout(finish, quietMs);
                const cap = setTimeout(finish, capMs);
                observer.observe(root, { attributes: true, characterData: true, childList: true, subtree: true });
            }),
        [QUIET_MS, QUIET_CAP_MS],
    );
}

async function captureStory(page: Page, baseUrl: string, id: string, outDir: string): Promise<boolean> {
    const url = `${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
    await page.goto(url, { timeout: 20000, waitUntil: 'load' });
    // options are the third argument — passing them second makes them the page-function arg and restores the 30s default
    const rendered = await page
        .waitForFunction(
            () => {
                const root = document.querySelector('#storybook-root, #root');
                return !!root && (root.children.length > 0 || (root.textContent ?? '').length > 0);
            },
            undefined,
            { timeout: 10000 },
        )
        .then(() => true)
        .catch(() => false);
    // floor first: async stories (SWR fetches, verified-build checks) can sit quiet before their data lands
    await page.waitForTimeout(SETTLE_FLOOR_MS);
    await waitForQuietDom(page).catch(() => {});
    await page.addStyleTag({ content: FREEZE_CSS }).catch(() => {});
    await page.waitForTimeout(100);
    await page.screenshot({ fullPage: false, path: `${outDir}/${id}.png` });
    return rendered;
}

/**
 * Captures each story's iframe at 2x DPR into `outDir/<id>.png`.
 * Per-story failures are collected, not fatal.
 */
export async function captureStories(options: CaptureOptions): Promise<CaptureResult> {
    const { baseUrl, ids, outDir, parallel, log = () => {}, provider = playwrightProvider() } = options;
    await mkdir(outDir, { recursive: true });
    const browser = await provider.launch();

    const failed: string[] = [];
    const empty: string[] = [];
    let nextIndex = 0;
    let done = 0;
    const worker = async () => {
        // A context per worker, wiped between stories: every story shares the Storybook origin, so localStorage
        // written by one (saved clusters, dev settings) reaches the next, and worker interleaving varies per run.
        // reducedMotion freezes animate-pulse skeletons etc. so captures don't depend on animation phase.
        const ctx = await browser.newContext({ deviceScaleFactor: 2, reducedMotion: 'reduce', viewport: VIEWPORT });
        const page = await ctx.newPage();
        while (nextIndex < ids.length) {
            const id = ids[nextIndex++];
            try {
                if (!(await captureStory(page, baseUrl, id, outDir))) empty.push(id);
            } catch (error) {
                failed.push(id);
                log(`fail ${id}: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                await page
                    .evaluate(() => {
                        localStorage.clear();
                        sessionStorage.clear();
                    })
                    .catch(() => {});
            }
            done++;
            if (done % 100 === 0) log(`${done}/${ids.length}`);
        }
        await ctx.close();
    };

    const workerCount = Math.max(1, Math.min(parallel, ids.length));
    await Promise.all(Array.from({ length: workerCount }, worker));
    await browser.close();
    return { captured: ids.length - failed.length, empty, failed };
}
