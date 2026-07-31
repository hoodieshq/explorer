// Length derivation. Two implementations, so the fixtures can show where they disagree.
//
// The quantity being derived is the account's SIZE at the viewed instruction, because payload length is size - 96
// for both a Buffer (no data_length field, body is everything after the header) and an in-place metadata PDA
// (initialize sets data_length = account.data_len() - 96).
//
// The distinction design.md misses: an observation is either a LOWER bound on that size or an UPPER bound.
//   - the forward SIZE REPLAY (createAccount.space, then allocate, extend, and `write` auto-grow applied in
//     execution order) -> LOWER bound. Pruned history can only make it too small, never too large.
//   - the rent-exempt balance -> UPPER bound. The only observation that can PROVE a length.
// A length is pinned only when the two meet. A single "best" anchor cannot prove completeness.
//
// The size replay must be a forward simulation, NOT `96 + sum(extend.length)`: `extend` adds to whatever size the
// account already has, so a payload that grew by `write` and was then extended is undercounted by an independent
// sum. design.md §4.2 demotes size replay to "the MECHANISM, never the anchor", which is what leaves the gap.
//
// Rent: minimum = (ACCOUNT_STORAGE_OVERHEAD + size) * lamports_per_byte * exemption_threshold. SIMD-0194 renamed
// the constant and set it to 6960 with a threshold of 1.0, replacing 3480 with a threshold of 2.0. The effective
// rate is 6960 lamports per byte either way, which is what the rent sysvar reports on mainnet and devnet today.

import { HEADER_LEN, RENT_LAMPORTS_PER_BYTE, RENT_OVERHEAD_BYTES } from './decode-ix.mjs';

/** Largest account size whose rent-exempt minimum is still <= `lamports`. */
export function sizeUpperBoundFromLamports(lamports) {
    return Math.floor(lamports / RENT_LAMPORTS_PER_BYTE) - RENT_OVERHEAD_BYTES;
}

/**
 * design.md §4.2 read literally: pick ONE anchor, best first, and treat the first two as EXACT.
 * Kept only so the fixtures can demonstrate what it returns.
 */
export function deriveLengthAsDesigned({ genesisSpace, extendedSize, balances, coverage }) {
    if (genesisSpace != null) {
        return { dataLength: genesisSpace - HEADER_LEN, provenance: 'pre-sized-genesis' };
    }
    if (extendedSize != null) {
        return { dataLength: extendedSize - HEADER_LEN, provenance: 'extend-replay' };
    }
    const maxBalance = Math.max(0, ...balances.filter(Boolean));
    if (maxBalance > 0) {
        const bound = sizeUpperBoundFromLamports(maxBalance) - HEADER_LEN;
        if (bound < coverage) return null; // parameter drift self-test
        return { dataLength: bound, provenance: 'rent-bound' };
    }
    return null;
}

/**
 * Corrected derivation. Returns the interval the size is known to lie in, plus what produced each end.
 * `pinned` is true only when the two ends meet, which is the only state that may be reported as complete.
 *
 * @param replayedSize  forward size simulation over the observed instructions (a LOWER bound)
 * @param coverage      max(write.offset + chunk.length) over recoverable writes (also a lower bound on size - 96)
 * @param balances      every non-zero balance observed for the account at or before the viewed instruction
 */
export function deriveLength({ replayedSize, coverage, balances }) {
    const lower = Math.max(HEADER_LEN, replayedSize ?? HEADER_LEN, (coverage ?? 0) + HEADER_LEN);

    const maxBalance = Math.max(0, ...balances.filter(b => typeof b === 'number' && b > 0));
    let upper = null;
    let declinedRentBound = null;
    if (maxBalance > 0) {
        const candidate = sizeUpperBoundFromLamports(maxBalance);
        // A bound below the replayed size is impossible for a rent-exempt account of that size, so the balance
        // window does not include an observation taken at or after the account reached its final size. That
        // happens whenever an account grows and closes inside one transaction (a zero post-balance is allowed,
        // so growth needs no top-up). Decline rather than shrink the reconstruction.
        if (candidate < lower) declinedRentBound = candidate;
        else upper = candidate;
    }

    const pinned = upper != null && upper === lower;
    return {
        dataLength: pinned ? lower - HEADER_LEN : null,
        declinedRentBound,
        lowerSize: lower,
        pinned,
        provenance: pinned ? { lower: 'size-replay', upper: 'rent-bound' } : null,
        // The best available length for RENDERING when not pinned: the lower bound. Rendering it is fine, calling
        // it complete is not.
        renderLength: lower - HEADER_LEN,
        upperSize: upper,
    };
}
