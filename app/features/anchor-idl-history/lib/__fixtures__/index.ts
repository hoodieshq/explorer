import { buildHistory, type RawTransaction } from '@entities/account-history';
import { address } from '@solana/kit';

import type { AnchorIdlHistoryResult } from '../../api/fetch-idl-history';
import { createAnchorIdlHistoryBuilder, replayBufferWrites } from '../history-builder';
import { parseAnchorIdlTransaction } from '../parse-idl-instruction';
import { InstructionType } from '../types';
import votingRaw from './voting-anchor-raw.json';

/**
 * Real Anchor IDL I/O captured from devnet's `voting` program (AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye).
 * Stored as raw RPC output — IDL account transactions plus the foreign buffer accounts
 * referenced by SetBuffer events. Processing (parse + replay + buffer resolution) happens at
 * load time using the same `buildHistory` + `replayBufferWrites` the production fetcher uses,
 * so stories exercise the real pipeline against real data.
 *
 * Regenerate via: `DEVNET_RPC_URL=… pnpx tsx scripts/dump-anchor-idl-fixture.ts`
 */
export function loadVotingAnchorFixture(): AnchorIdlHistoryResult {
    // JSON loses kit-branded types and the bigint→number coercion we did at dump time. Shape
    // and values are otherwise identical to live RPC output, so re-shaping is safe.
    const transactions = votingRaw.transactions as unknown as RawTransaction[];
    const bufferTxsByAddr = votingRaw.bufferTransactions as unknown as Record<string, RawTransaction[]>;
    const programAddress = address(votingRaw.programAddress);

    const bufferContents = resolveSetBufferContents(transactions, bufferTxsByAddr, programAddress);
    const snapshots = buildHistory(transactions, createAnchorIdlHistoryBuilder(programAddress, { bufferContents }));

    return {
        idlAddress: address(votingRaw.idlAddress),
        snapshots,
        totalSignatures: transactions.length,
        truncated: votingRaw.truncated,
    };
}

export const VOTING_PROGRAM_ADDRESS = address(votingRaw.programAddress);

function resolveSetBufferContents(
    idlTransactions: RawTransaction[],
    bufferTxsByAddr: Record<string, RawTransaction[]>,
    programAddress: ReturnType<typeof address>,
): Map<string, Uint8Array> {
    const resolvedByAddr = new Map<string, Uint8Array>();
    for (const [addr, txs] of Object.entries(bufferTxsByAddr)) {
        resolvedByAddr.set(addr, replayBufferWrites(txs, programAddress));
    }

    const result = new Map<string, Uint8Array>();
    for (const { info, transaction } of idlTransactions) {
        const base = {
            blockTime: info.blockTime !== null ? Number(info.blockTime) : undefined,
            failed: info.err !== null && info.err !== undefined,
            signature: info.signature,
            slot: Number(info.slot),
        };
        for (const event of parseAnchorIdlTransaction(transaction, base, programAddress)) {
            if (event.instructionType === InstructionType.SetBuffer && event.bufferAccount) {
                const bytes = resolvedByAddr.get(event.bufferAccount);
                if (bytes) result.set(event.signature, bytes);
            }
        }
    }
    return result;
}
