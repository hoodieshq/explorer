#!/usr/bin/env node
// Walks Storybook stories at http://localhost:6006 and saves a screenshot + console log per story.
// Usage: node capture.mjs <outDir> [idsFile]
//   idsFile defaults to ./all-story-ids.json (the canonical full set);
//   pass ./slice-story-ids.json (or any JSON array of story IDs) to capture a subset.

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.argv[2] ?? `${__dirname}/baseline`);
const idsFile = resolve(process.argv[3] ?? `${__dirname}/all-story-ids.json`);
const baseUrl = process.env.STORYBOOK_URL ?? 'http://localhost:6006';

await mkdir(outDir, { recursive: true });

const ids = JSON.parse(await readFile(idsFile, 'utf8'));
console.log(`[capture] ${ids.length} stories from ${idsFile.split('/').slice(-2).join('/')} → ${outDir}`);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
    viewport: { width: 1024, height: 768 },
    deviceScaleFactor: 1,
});
const page = await ctx.newPage();

const consoleLog = {};
const t0 = Date.now();
let failures = 0;

for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const url = `${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
    const messages = [];
    const onConsole = msg => {
        const type = msg.type();
        if (type === 'error' || type === 'warning') messages.push({ type, text: msg.text() });
    };
    page.on('console', onConsole);
    try {
        await page.goto(url, { waitUntil: 'load', timeout: 20000 });
        await page
            .waitForFunction(
                () => {
                    const root = document.querySelector('#storybook-root, #root');
                    return root && (root.children.length > 0 || root.textContent.length > 0);
                },
                { timeout: 10000 },
            )
            .catch(() => {});
        await page.waitForTimeout(200);
        await page.screenshot({ path: `${outDir}/${id}.png`, fullPage: false });
    } catch (e) {
        failures++;
        messages.push({ type: 'error', text: `[capture] navigation/screenshot failed: ${e.message}` });
    } finally {
        page.off('console', onConsole);
    }
    if (messages.length) consoleLog[id] = messages;
    if ((i + 1) % 25 === 0 || i === ids.length - 1) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[capture] ${i + 1}/${ids.length} (${elapsed}s, ${failures} failures)`);
    }
}

await writeFile(`${outDir}/console-log.json`, JSON.stringify(consoleLog, undefined, 2));
await browser.close();
console.log(
    `[capture] done. ${ids.length - failures}/${ids.length} ok, ${Object.keys(consoleLog).length} stories with console output`,
);
