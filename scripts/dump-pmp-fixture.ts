#!/usr/bin/env pnpx tsx

/**
 * One-off dumper that captures the raw I/O for a (program, seed) pair: the canonical PDA plus
 * every transaction touching it. Processing (parse + replay) happens at fixture-load time so
 * the fixture stays decoupled from our parsing/reconstruction logic — change the builder, no
 * fixture regeneration needed.
 *
 * Usage:
 *   pnpx tsx scripts/dump-pmp-fixture.ts [programAddress] [seed] [outPath]
 *
 * Defaults to AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye (devnet) seed=idl,
 * writing to app/features/program-metadata-history/lib/__fixtures__/voting-pmp-raw.json.
 *
 * Set DEVNET_RPC_URL to avoid public-endpoint rate limits.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { address } from '@solana/kit';
import { findCanonicalPda } from '@solana-program/program-metadata';

import { fetchAccountTransactions } from '../app/entities/account-history';

const DEFAULT_PROGRAM = 'AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye';
const DEFAULT_SEED = 'idl';
const DEFAULT_OUT = 'app/features/program-metadata-history/lib/__fixtures__/voting-pmp-raw.json';

async function main() {
    const programArg = process.argv[2] ?? DEFAULT_PROGRAM;
    const seed = process.argv[3] ?? DEFAULT_SEED;
    const outPath = resolve(process.argv[4] ?? DEFAULT_OUT);
    const rpcUrl = process.env.DEVNET_RPC_URL ?? 'https://api.devnet.solana.com';

    console.log(`Fetching ${programArg} seed=${seed} from ${new URL(rpcUrl).host} ...`);
    const [pdaAddress] = await findCanonicalPda({ program: address(programArg), seed });
    const { transactions, truncated } = await fetchAccountTransactions(rpcUrl, pdaAddress);

    const fixture = {
        pdaAddress,
        programAddress: programArg,
        seed,
        transactions,
        truncated,
    };

    mkdirSync(dirname(outPath), { recursive: true });
    // Kit returns slot/blockTime as bigint, which JSON.stringify can't handle natively.
    // Coerce to number — Solana slots and unix times fit comfortably in Number.MAX_SAFE_INTEGER.
    // Compact (no indent) — the file is a fixture, not for hand-editing.
    const json = JSON.stringify(fixture, (_, value) => (typeof value === 'bigint' ? Number(value) : value));
    writeFileSync(outPath, json + '\n');
    console.log(`Wrote ${transactions.length} transactions → ${outPath}`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
