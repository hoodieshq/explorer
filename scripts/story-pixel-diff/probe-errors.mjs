// Probe each given story ID; report any console error containing "must be used within a".
// Usage: node probe-errors.mjs (reads story IDs from probe-ids.json)

import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ids = JSON.parse(await readFile(`${__dirname}/probe-ids.json`, 'utf8'));
const baseUrl = process.env.STORYBOOK_URL ?? 'http://localhost:6006';

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
const page = await ctx.newPage();

const findings = [];
for (const id of ids) {
    const errors = [];
    const onConsole = msg => {
        if (msg.type() === 'error') {
            const text = msg.text();
            if (text.includes('must be used within') || text.includes('Error rendering story')) {
                errors.push(text.slice(0, 200));
            }
        }
    };
    page.on('console', onConsole);
    page.on('pageerror', e => errors.push(`PAGEERR: ${e.message.slice(0, 200)}`));
    try {
        await page.goto(`${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`, {
            waitUntil: 'load',
            timeout: 15000,
        });
        await page.waitForTimeout(800);
    } catch (e) {
        errors.push(`NAV: ${e.message}`);
    }
    page.off('console', onConsole);
    if (errors.length) {
        // Dedupe — keep distinct messages
        const unique = [...new Set(errors)];
        findings.push({ id, errors: unique });
        console.log(`✗ ${id}`);
        for (const e of unique) console.log(`    ${e}`);
    } else {
        console.log(`✓ ${id}`);
    }
}

await browser.close();
console.log(`\n${findings.length}/${ids.length} stories with errors`);
