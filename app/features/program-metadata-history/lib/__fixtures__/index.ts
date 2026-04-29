import { buildHistory, type RawTransaction } from '@entities/account-history';
import { address } from '@solana/kit';

import type { MetadataHistoryResult } from '../../api/fetch-metadata-history';
import { createMetadataHistoryBuilder } from '../history-builder';
import votingPmpRaw from './voting-pmp-raw.json';

/**
 * Real PMP I/O captured from devnet's `voting` program (AXcxp15oz1L4YYtqZo6Qt6EkUj1jtLR6wXYqaJvn4oye).
 * The fixture stores raw RPC output — PDA + transactions — so it stays decoupled from our
 * parsing/reconstruction logic. Processing (parse + replay) happens here at load time using
 * the same `buildHistory` + builder the production fetcher uses, so stories exercise the real
 * pipeline against real data.
 *
 * Regenerate via: `DEVNET_RPC_URL=… pnpx tsx scripts/dump-pmp-fixture.ts`
 */
export function loadVotingPmpFixture(): MetadataHistoryResult {
    // JSON loses the kit-branded types (Address, base58 strings) and the bigint→number coercion
    // we did at dump time. The shape and values are otherwise identical to the live RPC output,
    // so re-shaping back to RawTransaction[] is safe.
    const transactions = votingPmpRaw.transactions as unknown as RawTransaction[];
    const snapshots = buildHistory(transactions, createMetadataHistoryBuilder());
    return {
        pdaAddress: address(votingPmpRaw.pdaAddress),
        snapshots,
        totalSignatures: transactions.length,
        truncated: votingPmpRaw.truncated,
    };
}
