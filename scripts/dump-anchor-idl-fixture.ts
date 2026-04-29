#!/usr/bin/env pnpx tsx

/**
 * One-off dumper for an Anchor IDL account's raw history. Captures the IDL account's
 * transactions plus, for every SetBuffer encountered, the source buffer account's transactions.
 * Processing (parse + replay + buffer resolution) happens at fixture-load time so the fixture
 * stays decoupled from our parsing/reconstruction logic.
 *
 * Usage:
 *   pnpx tsx scripts/dump-anchor-idl-fixture.ts [programAddress] [outPath]
 *
 * Defaults to AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye on devnet,
 * writing to app/features/anchor-idl-history/lib/__fixtures__/voting-anchor-raw.json.
 *
 * Set DEVNET_RPC_URL (or override RPC_URL) to avoid public-endpoint rate limits.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { idlAddress as deriveIdlAddress } from '@coral-xyz/anchor/dist/cjs/idl';
import { fetchAccountTransactions, type RawTransaction } from '@entities/account-history';
import { type Address, address } from '@solana/kit';

import { parseAnchorIdlTransaction } from '../app/features/anchor-idl-history/lib/parse-idl-instruction';
import { InstructionType } from '../app/features/anchor-idl-history/lib/types';
import { toAddress, toPublicKey } from '../app/shared/lib/web3js-compat';

const DEFAULT_PROGRAM = 'AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye';
const DEFAULT_OUT = 'app/features/anchor-idl-history/lib/__fixtures__/voting-anchor-raw.json';

async function main() {
    const programArg = process.argv[2] ?? DEFAULT_PROGRAM;
    const outPath = resolve(process.argv[3] ?? DEFAULT_OUT);
    const rpcUrl = process.env.RPC_URL ?? process.env.DEVNET_RPC_URL ?? 'https://api.devnet.solana.com';

    console.log(`Fetching ${programArg} from ${new URL(rpcUrl).host} ...`);
    const programAddress = address(programArg);
    const idlAddr = toAddress(await deriveIdlAddress(toPublicKey(programAddress)));
    const { transactions, truncated } = await fetchAccountTransactions(rpcUrl, idlAddr);

    const bufferAddrs = collectBufferAddresses(transactions, programAddress);
    const bufferTransactions: Record<string, RawTransaction[]> = {};
    if (bufferAddrs.length > 0) {
        console.log(`Resolving ${bufferAddrs.length} foreign buffer account(s)...`);
        await Promise.all(
            bufferAddrs.map(async addr => {
                const result = await fetchAccountTransactions(rpcUrl, addr as Address);
                bufferTransactions[addr] = result.transactions;
            }),
        );
    }

    const fixture = {
        bufferTransactions,
        idlAddress: idlAddr,
        programAddress: programArg,
        transactions,
        truncated,
    };

    mkdirSync(dirname(outPath), { recursive: true });
    // bigint slot/blockTime → number; Solana slots fit in Number.MAX_SAFE_INTEGER. Compact (no
    // indent) — fixture is regenerated, not hand-edited.
    const json = JSON.stringify(fixture, (_, value) => (typeof value === 'bigint' ? Number(value) : value));
    writeFileSync(outPath, json + '\n');
    console.log(`Wrote ${transactions.length} IDL transactions + buffers for [${bufferAddrs.join(', ')}] → ${outPath}`);
}

function collectBufferAddresses(transactions: RawTransaction[], programAddress: Address): string[] {
    const seen = new Set<string>();
    for (const { info, transaction } of transactions) {
        const base = {
            blockTime: info.blockTime !== null ? Number(info.blockTime) : undefined,
            failed: info.err !== null && info.err !== undefined,
            signature: info.signature,
            slot: Number(info.slot),
        };
        for (const event of parseAnchorIdlTransaction(transaction, base, programAddress)) {
            if (event.instructionType === InstructionType.SetBuffer && event.bufferAccount) {
                seen.add(event.bufferAccount);
            }
        }
    }
    return [...seen];
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
