// Regenerates `simulation-capture.json` by replaying the exact RPC pipeline `runSimulation` uses
// (see app/features/instruction-simulation/lib/simulate-transaction.ts) against a live mainnet
// transaction, then trimming the UI-irrelevant account data blobs.
//
// Usage (from repo root):
//   node storybook-design/vendor/features/instruction-simulation/mocks/capture-simulation.mjs
//   CAP_RPC='https://your-rpc' node storybook-design/vendor/features/instruction-simulation/mocks/capture-simulation.mjs
//
// Picks a recent successful SPL-token transaction so the fixture exercises every card: program
// logs, CU profiling, SOL balance changes, and token balance changes. Public RPCs rate-limit
// heavily — pass CAP_RPC if the default 429s.

/* eslint-disable unicorn/no-null -- the JSON fixture needs explicit `null` for missing accounts and
   for the success `err` field; `undefined` would be dropped by JSON.stringify and break the shape. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { AddressLookupTableAccount, Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

const RPC = process.env.CAP_RPC || 'https://api.mainnet-beta.solana.com';
const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const isTokenOwner = owner => owner === TOKEN_PROGRAM.toBase58() || owner === TOKEN_2022_PROGRAM.toBase58();

const outFile = path.join(path.dirname(fileURLToPath(import.meta.url)), 'simulation-capture.json');
const connection = new Connection(RPC, 'confirmed');
const b64 = bytes => Buffer.from(bytes).toString('base64');

async function pickMessage() {
    const sigs = await connection.getSignaturesForAddress(TOKEN_PROGRAM, { limit: 25 });
    for (const sig of sigs) {
        if (sig.err) continue;
        const tx = await connection.getTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
        const hasTokenBalances =
            (tx?.meta?.preTokenBalances?.length ?? 0) + (tx?.meta?.postTokenBalances?.length ?? 0) > 0;
        if (tx && hasTokenBalances) return { message: tx.transaction.message, signature: sig.signature };
    }
    throw new Error('no suitable token transaction found in recent signatures');
}

const { message, signature } = await pickMessage();

// Resolve lookup tables so we enumerate the same account keys the app would.
const lookups = message.addressTableLookups ?? [];
const lutInfos = [];
const lutAccounts = [];
if (lookups.length) {
    const keys = lookups.map(lookup => lookup.accountKey);
    const infos = await connection.getMultipleAccountsInfo(keys);
    infos.forEach((info, i) => {
        if (!info) {
            lutInfos.push(null);
            return;
        }
        lutInfos.push({
            dataBase64: b64(info.data),
            executable: info.executable,
            key: keys[i].toBase58(),
            lamports: info.lamports,
            owner: info.owner.toBase58(),
            rentEpoch: info.rentEpoch,
        });
        lutAccounts.push(
            new AddressLookupTableAccount({
                key: keys[i],
                state: AddressLookupTableAccount.deserialize(Uint8Array.from(info.data)),
            }),
        );
    });
}

const accountKeys = message.getAccountKeys({ addressLookupTableAccounts: lutAccounts }).keySegments().flat();

const [pre, epochInfo] = await Promise.all([
    connection.getMultipleParsedAccounts(accountKeys),
    connection.getEpochInfo(),
]);

const sim = await connection.simulateTransaction(new VersionedTransaction(message), {
    accounts: { addresses: accountKeys.map(key => key.toBase58()), encoding: 'base64' },
    replaceRecentBlockhash: true,
});

// computeSolBalanceChanges only reads lamports, and token parsing only touches token-program-owned
// accounts — so blank every other account's data blob to keep the fixture small.
const serializePre = account => {
    if (!account) return null;
    const keepData = isTokenOwner(account.owner.toBase58());
    const data =
        keepData && account.data && !Buffer.isBuffer(account.data) && 'parsed' in account.data
            ? { kind: 'parsed', value: account.data }
            : { base64: keepData ? b64(account.data) : '', kind: 'buffer' };
    return {
        data,
        executable: account.executable,
        lamports: account.lamports,
        owner: account.owner.toBase58(),
        rentEpoch: account.rentEpoch,
        space: account.space,
    };
};

const serializeSim = account => {
    if (!account) return null;
    return {
        dataBase64: isTokenOwner(account.owner)
            ? Array.isArray(account.data)
                ? account.data[0]
                : b64(account.data)
            : '',
        executable: account.executable,
        lamports: account.lamports,
        owner: account.owner,
        rentEpoch: account.rentEpoch,
    };
};

const fixture = {
    sourceSignature: signature,
    rpc: new URL(RPC).origin,
    messageBase64: b64(message.serialize()),
    messageVersion: message.version,
    accountKeys: accountKeys.map(key => key.toBase58()),
    lutInfos,
    epoch: epochInfo.epoch,
    parsedAccountsPre: pre.value.map(serializePre),
    simulation: {
        err: sim.value.err,
        logs: sim.value.logs,
        unitsConsumed: sim.value.unitsConsumed,
        accounts: (sim.value.accounts ?? []).map(serializeSim),
    },
};

fs.writeFileSync(outFile, `${JSON.stringify(fixture, null, 2)}\n`);
console.error(
    `wrote ${outFile} (tx=${signature}, err=${JSON.stringify(sim.value.err)}, logs=${sim.value.logs?.length}, CU=${sim.value.unitsConsumed})`,
);
