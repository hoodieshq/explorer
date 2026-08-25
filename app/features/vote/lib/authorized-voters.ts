import type { PublicKey } from '@solana/web3.js';

import type { AuthorizedVoter } from './validators';

/** A collapsed run of one authority, spanning `fromEpoch` (earliest) to `toEpoch` (latest) retained epoch. */
export interface AuthorizedVoterRange {
    authorizedVoter: PublicKey;
    fromEpoch: number;
    toEpoch: number;
}

/**
 * Collapses the per-epoch copies the vote program writes for an unchanged authority into one range per run.
 * On chain `authorizedVoters` is a `BTreeMap<Epoch, Pubkey>`: an entry authorizes its key from that epoch on
 * until a later entry overrides it, and the program re-caches the active key under the current epoch on the
 * first vote of every epoch, so an authority that never changed still piles up identical entries. Each run
 * collapses to a single `{ fromEpoch, toEpoch }` spanning its earliest and latest retained epoch.
 *
 * Only adjacent duplicates collapse — an authority can be rotated away and back, and grouping by pubkey
 * would merge those runs and claim the key was authorized across the gap.
 *
 * `fromEpoch` is a lower bound, not the real start: entries below `currentEpoch - 1` are purged and vote
 * state v4 keeps no `priorVoters`, so anything earlier is unrecoverable from the account.
 *
 * The result is ordered newest-first (highest epoch on top) for display. Runs are built on the ascending
 * sort, so only the final order is reversed; within each range `fromEpoch <= toEpoch`.
 */
export function collapseAuthorizedVoters(voters: AuthorizedVoter[]): AuthorizedVoterRange[] {
    const runs: AuthorizedVoterRange[] = [];
    for (const { authorizedVoter, epoch } of [...voters].sort((a, b) => a.epoch - b.epoch)) {
        const current = runs[runs.length - 1];
        if (current?.authorizedVoter.equals(authorizedVoter)) {
            // Same key as the previous entry — extend the open run's upper bound instead of adding a row.
            current.toEpoch = epoch;
        } else {
            runs.push({ authorizedVoter, fromEpoch: epoch, toEpoch: epoch });
        }
    }
    return runs.reverse();
}
