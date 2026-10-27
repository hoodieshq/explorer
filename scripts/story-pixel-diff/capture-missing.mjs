#!/usr/bin/env node
// Captures only the IDs in missing-story-ids.json into the target dir (default: phase2-baseline).
// Usage: node capture-missing.mjs [outDir]

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.argv[2] ?? `${__dirname}/phase2-baseline`);
const baseUrl = process.env.STORYBOOK_URL ?? 'http://localhost:6006';

await mkdir(outDir, { recursive: true });

const ids = JSON.parse(await readFile(`${__dirname}/missing-story-ids.json`, 'utf8'));
console.log(`[capture-missing] ${ids.length} stories → ${outDir}`);

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
        messages.push({ type: 'error', text: `[capture-missing] navigation/screenshot failed: ${e.message}` });
    } finally {
        page.off('console', onConsole);
    }
    if (messages.length) consoleLog[id] = messages;
    if ((i + 1) % 10 === 0 || i === ids.length - 1) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`[capture-missing] ${i + 1}/${ids.length} (${elapsed}s, ${failures} failures)`);
    }
}

await writeFile(`${outDir}/console-log-missing.json`, JSON.stringify(consoleLog, undefined, 2));
await browser.close();
console.log(
    `[capture-missing] done. ${ids.length - failures}/${ids.length} ok, ${Object.keys(consoleLog).length} stories with console output`,
);
