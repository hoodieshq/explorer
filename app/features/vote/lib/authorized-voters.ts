import type { AuthorizedVoter } from './validators';

/**
 * Drops the per-epoch copies the vote program writes for an unchanged authority, keeping the earliest
 * epoch of each run. On chain `authorizedVoters` is a `BTreeMap<Epoch, Pubkey>`: an entry authorizes its
 * key from that epoch on until a later entry overrides it, and the program re-caches the active key under
 * the current epoch on the first vote of every epoch, so an authority that never changed still piles up
 * identical entries.
 *
 * Only adjacent duplicates collapse — an authority can be rotated away and back, and grouping by pubkey
 * would merge those runs and claim the key was authorized across the gap.
 *
 * The earliest epoch is a lower bound, not the real start: entries below `currentEpoch - 1` are purged and
 * vote state v4 keeps no `priorVoters`, so anything earlier is unrecoverable from the account.
 */
export function collapseAuthorizedVoters(voters: AuthorizedVoter[]): AuthorizedVoter[] {
    return [...voters]
        .sort((a, b) => a.epoch - b.epoch)
        .filter((voter, index, sorted) => !sorted[index - 1]?.authorizedVoter.equals(voter.authorizedVoter));
}
