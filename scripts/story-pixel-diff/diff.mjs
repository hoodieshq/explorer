#!/usr/bin/env node
// Compares baseline/ and after/ PNGs by content hash and console-log.json by per-story message set.

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const baselineDir = resolve(__dirname, 'baseline');
const afterDir = resolve(__dirname, 'after');

async function hashFile(path) {
    const buf = await readFile(path);
    return createHash('sha256').update(buf).digest('hex');
}

const baselineFiles = (await readdir(baselineDir)).filter(f => f.endsWith('.png'));
const afterFiles = new Set((await readdir(afterDir)).filter(f => f.endsWith('.png')));

const changed = [];
const missing = [];
for (const f of baselineFiles) {
    if (!afterFiles.has(f)) {
        missing.push(f);
        continue;
    }
    const [a, b] = await Promise.all([hashFile(`${baselineDir}/${f}`), hashFile(`${afterDir}/${f}`)]);
    if (a !== b) changed.push(f);
}

const addedConsole = {};
const baselineLog = JSON.parse(await readFile(`${baselineDir}/console-log.json`, 'utf8'));
const afterLog = JSON.parse(await readFile(`${afterDir}/console-log.json`, 'utf8'));
for (const id of Object.keys(afterLog)) {
    const beforeSet = new Set((baselineLog[id] ?? []).map(m => `${m.type}:${m.text}`));
    const added = afterLog[id].filter(m => !beforeSet.has(`${m.type}:${m.text}`));
    if (added.length) addedConsole[id] = added;
}

console.log(`screenshots: ${baselineFiles.length} compared, ${changed.length} differ, ${missing.length} missing`);
if (changed.length) {
    console.log('\nchanged screenshots:');
    for (const f of changed) console.log(`  ${f}`);
}
console.log(`\nconsole: ${Object.keys(addedConsole).length} stories have new messages`);
if (Object.keys(addedConsole).length) {
    for (const [id, msgs] of Object.entries(addedConsole)) {
        console.log(`  ${id}:`);
        for (const m of msgs) console.log(`    [${m.type}] ${m.text.slice(0, 200)}`);
    }
}
