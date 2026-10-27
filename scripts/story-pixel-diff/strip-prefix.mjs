// Boundary-aware codemod: strips the Tailwind `e-` prefix from class tokens.
// The `e` of the prefix must sit on a class boundary (quote/space/.: ({,[}), and
// be followed by a tailwind utility start ([a-z[). Negatives `-e-mt-1` -> `-mt-1`.
// This protects non-class substrings like `code-block` (the `e-b` there is NOT at a boundary).
//
// Usage:
//   node strip-prefix.mjs --dry           report unique tokens + per-file counts, write nothing
//   node strip-prefix.mjs --dry --tokens  just print the sorted unique stripped tokens
//   node strip-prefix.mjs --apply         rewrite files in place

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

const ROOT = join(process.cwd(), 'app');
const EXTS = new Set(['.ts', '.tsx', '.css']);
// eslint-disable-next-line no-restricted-syntax -- codemod matches the e- prefix at class-token boundaries
const RE = /(?<=[\s"'`.:({,[}!])(-?)e-(?=[a-z[])/g;

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const tokensOnly = args.includes('--tokens');
const previewArg = args[args.indexOf('--preview') + 1];
if (args.includes('--preview')) {
    for (const rel of previewArg.split(',')) {
        const p = join(process.cwd(), rel);
        const src = readFileSync(p, 'utf8').split('\n');
        const next = readFileSync(p, 'utf8')
            .replace(RE, (m, neg) => neg)
            .split('\n');
        console.log(`\n=== ${rel} ===`);
        for (let i = 0; i < src.length; i++) {
            if (src[i] !== next[i]) {
                console.log(`- ${src[i].trim()}`);
                console.log(`+ ${next[i].trim()}`);
            }
        }
    }
    process.exit(0);
}

function walk(dir, out = []) {
    for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        const s = statSync(p);
        if (s.isDirectory()) {
            if (name === 'node_modules' || name === '.next' || name.startsWith('storybook-static')) continue;
            walk(p, out);
        } else if (EXTS.has(extname(name))) {
            out.push(p);
        }
    }
    return out;
}

const files = walk(ROOT);
const tokenCounts = new Map();
const perFile = [];
let totalHits = 0;

for (const file of files) {
    const src = readFileSync(file, 'utf8');
    let hits = 0;
    const next = src.replace(RE, (m, neg, offset, str) => {
        hits++;
        // capture the full stripped token for the dry report
        // eslint-disable-next-line no-restricted-syntax -- codemod tokenises class strings
        const rest = str.slice(offset + m.length).match(/^[a-z0-9[\]:_./-]*/)?.[0] ?? '';
        // eslint-disable-next-line no-restricted-syntax -- codemod tokenises class strings
        const tok = `${neg}e-${rest.split(/[\s"'`)}]/)[0]}`;
        tokenCounts.set(tok, (tokenCounts.get(tok) ?? 0) + 1);
        return neg;
    });
    if (hits) {
        totalHits += hits;
        perFile.push([file, hits]);
        if (apply && next !== src) writeFileSync(file, next);
    }
}

if (tokensOnly) {
    for (const t of [...tokenCounts.keys()].sort()) console.log(t);
    process.exit(0);
}

console.log(
    `${apply ? 'APPLIED' : 'DRY'}: ${totalHits} replacements across ${perFile.length} files (${files.length} scanned)`,
);
console.log(`unique tokens: ${tokenCounts.size}`);
console.log('\ntop 20 files by hits:');
for (const [f, h] of perFile.sort((a, b) => b[1] - a[1]).slice(0, 20)) {
    console.log(`  ${String(h).padStart(4)}  ${f.replace(`${process.cwd()}/`, '')}`);
}
