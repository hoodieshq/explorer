// Copies built Anchor fixture artifacts (IDL JSON + companion TS type) into the committed test
// fixtures dir, so the suite reads them without the Rust/Anchor toolchain. Runs after `anchor build`
// (see build:programs); the committed copies are what tests and typecheck actually consume.
import { copyFileSync, existsSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('src/__tests__/generated/', ROOT);

const ARTIFACTS = [
    ['test-anchor-programs/simple/target/idl/simple.json', 'simple.json'],
    ['test-anchor-programs/simple/target/types/simple.ts', 'simple.types.ts'],
    ['test-anchor-programs/simple-031/target/idl/simple_031.json', 'simple-031.json'],
    ['test-anchor-programs/simple-031/target/types/simple_031.ts', 'simple-031.types.ts'],
];

for (const [from, to] of ARTIFACTS) {
    const src = new URL(from, ROOT);
    if (!existsSync(src)) {
        throw new Error(`missing ${from} — run \`pnpm run build:programs\` (Anchor toolchain) first`);
    }
    copyFileSync(src, new URL(to, OUT));
    console.log('copied', to);
}
