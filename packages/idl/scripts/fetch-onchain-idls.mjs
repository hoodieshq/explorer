// Refreshes the on-chain IDL snapshots under src/__tests__/generated/ (manual run; network required):
//   node scripts/fetch-onchain-idls.mjs
// Resolves via @solana/idl exactly like the app's resolve-program-idls (PMP + Anchor PDA side by side).
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLatestIdls, fetchPmpIdl } from '@solana/idl';
import { address, createSolanaRpc } from '@solana/kit';

const RPC_URL = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';

// slug → { address, native } (native programs have no Anchor PDA; PMP only — mirrors NON_ANCHOR_PROGRAMS)
const TARGETS = {
    'let-me-buy': { address: 'BUYuxRfhCMWavaUWxhGtPP3ksKEDZxCD5gzknk3JfAya', native: false },
    tokenkeg: { address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', native: true },
};

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', '__tests__', 'generated');
await mkdir(outDir, { recursive: true });

const rpc = createSolanaRpc(RPC_URL);
for (const [slug, target] of Object.entries(TARGETS)) {
    const contents = {};
    if (target.native) {
        const result = await fetchPmpIdl(rpc, address(target.address));
        if (result.status === 'ok') contents.pmp = result.content;
    } else {
        const { anchor, pmp } = await fetchLatestIdls(rpc, address(target.address));
        if (anchor[0]?.content) contents.anchor = anchor[0].content;
        if (pmp[0]?.content) contents.pmp = pmp[0].content;
    }
    for (const [source, content] of Object.entries(contents)) {
        const idl = JSON.parse(content);
        const file = join(outDir, `${slug}.${source}.idl.json`);
        await writeFile(file, `${JSON.stringify(idl, null, 2)}\n`);
        const standard = idl?.kind === 'rootNode' ? 'codama' : idl?.metadata?.spec ? 'anchor' : 'legacy/other';
        console.log(`${slug}.${source}: ${standard} — name: ${idl?.program?.name ?? idl?.metadata?.name ?? idl?.name}`);
    }
}
