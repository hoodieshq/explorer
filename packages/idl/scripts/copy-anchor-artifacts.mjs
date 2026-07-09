// Copies built Anchor fixture artifacts (IDL JSON + companion TS type) into the committed
// __fixtures__ dir, so the suite reads them without the Rust/Anchor toolchain. Runs after
// `anchor build` (see build:programs); the committed copies are what tests and typecheck consume.
import { copyFileSync, existsSync } from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('__fixtures__/', ROOT);

const ARTIFACTS = [
    'test-anchor-programs/simple/target/idl/simple.json',
    'test-anchor-programs/simple/target/types/simple.ts',
    'test-anchor-programs/simple-031/target/idl/simple_031.json',
    'test-anchor-programs/simple-031/target/types/simple_031.ts',
];

for (const from of ARTIFACTS) {
    const src = new URL(from, ROOT);
    if (!existsSync(src)) {
        throw new Error(`missing ${from} — run \`pnpm run build:programs\` (Anchor toolchain) first`);
    }
    const name = from.split('/').pop();
    copyFileSync(src, new URL(name, OUT));
    console.log('copied', name);
}
