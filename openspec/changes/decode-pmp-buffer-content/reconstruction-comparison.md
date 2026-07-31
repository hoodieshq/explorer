# Comparison: write-extent vs anchored payload length

Companion to `design.md` §4.2, which states the decision. This document exists to justify it side by side against
the alternative, because both existing implementations take the alternative and a reviewer will reasonably ask why
we do not. Facts below were ground-truthed against the installed packages and the two prior implementations.

**Scope.** The code below exists to make the LENGTH argument concrete and nothing more. `patch`, `isOrdered` and
`collectAnchorInputs` are illustrative sketches. They do NOT address the replay defects - execution ordering,
session scoping across `close`, inner instructions, and the execution-position bound - which the p2 spec owns.

Sources checked:
- `@solana/idl`'s `reconstructBufferData` (`node_modules/@solana/idl/dist/index.js:509-537`), growth via
  `writeChunk` (`:28-37`), length read back at `:578`, `:602`, `:609`.
- PR #90 `hoodieshq/explorer` (`feat/pmp-history`),
  `app/features/program-metadata-history/lib/history-builder.ts:92-109`.
- `@solana/kit` rent parameters (`dist/index.node.mjs:162-168`).
- `@solana-program/program-metadata@0.7.0` instruction plans (`src/createBuffer.ts:51`, `:54-60`,
  `src/utils.ts:85-87`, `:194-212`, `src/updateBuffer.ts:49-56`, `src/updateMetadata.ts:166-174`, `:234-242`) and
  `REALLOC_LIMIT` (`src/internals.ts:3`). The package ships its TypeScript sources, and source paths survive a
  version bump where minified bundle line numbers do not.

## Overview

Buffer reconstruction replays a PMP account's `write` history and offset-patches each chunk into a fixed-size
buffer. To allocate that buffer it needs a payload length, and that is the only place the two approaches differ.

**Write extent.** Grow the array to fit each chunk, then read the final array length back out as the payload
length: `data_length := max(write.offset + chunk.length)` over the writes that were actually received.

**Anchored.** Derive the length from BOUNDS that RPC retention cannot move, then treat the recovered writes as a
claim to be checked against them. There is no preferred anchor and no best-first list. There is one lower bound and
one upper bound.

- A live read of the metadata account, when the viewed transaction is that account's current state. This is not a
  bound but a bypass, since it supplies the bytes too and no `write` history is fetched at all.
- LOWER bounds on the account's size at the viewed instruction: the size the genesis System `createAccount` created
  the account at (`createBuffer.ts:54-60`), `96 + sum(extend.length)`, and `96 + max(write.offset + chunk.length)`
  over recoverable writes, because `write` auto-grows the account. A forward size replay in execution order over
  creation, `allocate`, `extend` and `write` auto-grow yields the greatest of these. RPC retention can only make a
  lower bound too SMALL, never too large. None of these is exact and none of them may be labelled EXACT.
- UPPER bound: the account's rent-exempt balance, which is the only observation that can PROVE a length. It is
  valid only when some non-zero balance was observed at or AFTER the account reached its final size, because an
  account may grow and close inside one transaction with no top-up (a zero post-balance is an allowed rent state).
  A derived candidate must be confirmed against `getMinimumBalanceForRentExemption` rather than a hardcoded
  lamports-per-byte rate.

Verdicts:

- `lower == upper` -> the length is PINNED, and the result MAY be reported complete provided coverage has no
  interior gap, no unrecoverable range, and no unorderable conflict.
- `upper > lower`, or no upper bound was observed -> nothing pins the length, so the result is BEST-EFFORT ("may be
  truncated"), never complete. Where the shortfall is demonstrable as a concrete gap the status is `incomplete`,
  which is the stronger of the two labels.
- `upper < lower` -> impossible for a rent-exempt account of that size, so the UPPER BOUND IS DECLINED rather than
  applied, and the result is best-effort.
- Nothing may shorten the reconstruction below the replayed size. A candidate below it is declined, not applied.

### Why neither the genesis size nor the `extend` chain is exact

`write` auto-grows the account and `getUpdateBufferInstructionPlan` rewrites a live buffer with no `allocate` and no `close`, so a stale creation size
sits at or above the surviving coverage and gets accepted, truncating the payload and reporting it complete. The
`extend` chain additionally undercounts because the client passes a size DELTA on the update paths
(`updateBuffer.ts:49-56`, `updateMetadata.ts:166-174` and `:234-242` pass `sizeDifference`, not the payload length)
and because kit's realloc packer emits a trailing zero-length `extend` when the total is an exact multiple of
`REALLOC_LIMIT = 10240` (`internals.ts:3`), so the chain sums to `totalSize - 10240`. The client emits `extend` only
above `REALLOC_LIMIT` (`utils.ts:194-212`), so below that size the chain contributes nothing at all.

Worked failure for the stale genesis, which is the one a best-first list cannot survive. A buffer is created
pre-sized at 8 bytes of payload, then rewritten to 16 by `getUpdateBufferInstructionPlan`, which issues no
`allocate` and no `close`, and the rewrite's tail write is pruned:

```
genesisSpace - 96 = 8      coverage = 8      true payload = 16
best-first: candidate 8 is not < coverage 8, so the stale anchor is ACCEPTED
coversFully(covered, 8)    -> true
verdict                    -> complete, for a payload that is actually 16 bytes
```

Under the bounds model the same observations give `lowerSize = max(96, 96 + 8, 96 + 8) = 104` with no upper bound
that meets it, so the length is not pinned and the result cannot be reported complete.

### The two are not rival algorithms

The anchored approach still computes the write extent. It patches the same chunks in the same execution order and
produces byte-identical output. What changes is what the extent is permitted to be:

- write extent: the coverage measurement IS the answer
- anchored: the coverage measurement is one lower bound among several, and a retention-independent upper bound is
  what decides whether the answer is proven

### Why the extent is circular

Letting the writes define the length makes the coverage check self-fulfilling for a missing tail. A pruned tail
write lowers `data_length` by exactly the amount it fails to cover, so the check passes against the shrunken
target and truncated content renders as complete.

Worked example, a 3,000-byte payload written as three ~1 KB chunks at offsets 0, 1000 and 2000, third write pruned:

```
writes      = [{offset: 0, len: 1000}, {offset: 1000, len: 1000}]
extent      = 2000              -> data_length := 2000
coverage    = [0, 1000) + [1000, 2000) reaches 2000, which is >= data_length
verdict     = complete          -> 2,000 of 3,000 bytes rendered as the whole document
```

Two qualifications keep this honest:

- An INTERIOR gap is still detectable under extent sizing, because the hole sits inside `[0, extent)`. It is the
  TAIL that is structurally invisible. Neither prior implementation runs the check at all, so both silently
  zero-fill interior gaps through `new Uint8Array(needed)`.
- The failure is quiet, not loud. Truncated `Json` fails `JSON.parse` and falls back to the raw string, which at
  least signals something. Truncated `Yaml`, `Toml` or `None` renders as a plausible complete document.

### No prior art to reuse

Neither existing implementation carries an anchor, and neither is closer to one than the other:

- `@solana/idl`'s `reconstructBufferData` grows to fit and reads the extent back as the length. It has no coverage
  check, no slot bound, and it filters to `programId == PMP && accounts[0] == target`, which structurally cannot
  see the System `createAccount` that carries the genesis size. Its source-buffer recursion lives one level up
  in `applyInstruction` (`:562`), not inside the buffer replay, which skips a zero-length chunk at `:530`.
- PR #90's PMP path does no foreign-buffer replay at all. `fetchMetadataHistory` fetches only the metadata PDA's
  transactions, so a `setData` sourcing from a foreign buffer leaves `rawData` undefined with
  `bufferBytesWritten === 0` and the snapshot silently carries the previous content forward. Its `applyWrite` sizes
  to `writeOffset + rawData.length` for the in-place case, and its `bufferBytesWritten` counter is a running SUM,
  so it cannot separate a gap from an overlap either. The `replayBufferWrites` helper exists only in the ANCHOR IDL
  feature and is a sequential append that ignores `offset` entirely, correct for Anchor and wrong for PMP.

## Comparison

Verdicts by scenario. Both approaches recover identical bytes in every row, so the only thing that differs is what
the card is able to say about them.

| Scenario | Write extent | Anchored | Truth | Winner |
|---|---|---|---|---|
| Keypair buffer, full history retained | complete | complete (lower == upper, pinned) | complete | tie |
| Keypair buffer, tail write pruned | complete | incomplete | incomplete | anchored |
| Keypair buffer, genesis and tail both pruned | complete | incomplete (exact funding) | incomplete | anchored |
| PDA in-place, payload <= 10240, tail pruned | complete | incomplete (funding transfer) | incomplete | anchored |
| Large payload (> 10240), tail pruned | complete | incomplete (replay > coverage) | incomplete | anchored |
| Interior coverage gap | complete, NUL-filled | incomplete | incomplete | anchored |
| Same-slot conflicting overlap, no intra-slot index | complete | ambiguous | unknowable | anchored |
| Over-funded account, grown by `write`, tail pruned | complete | best-effort | incomplete | anchored, weakly |
| Over-funded, full history, no exact-funding match | complete | best-effort | complete | write extent |

A row reports `incomplete` rather than `best-effort` whenever the derived length exceeds coverage and the shortfall
lands as a concrete gap. Two observations put the length above coverage. One is a size replay whose lower bound is
higher than the surviving writes reach, which is the genesis pre-size on the `tail write pruned` row and the
`extend` chain on the large-payload row. The other is a rent upper bound confirmed by an exact-funding match against
`getMinimumBalanceForRentExemption`, which makes it a proven size rather than a ceiling, and that is what carries
the two rows where the genesis has itself been pruned. A rent bound that is only a ceiling can do neither, which is
the last row.

One row favours the write extent, and it is a false NEGATIVE rather than a false positive: a correct result
labelled uncertain. It requires funding above the rent minimum by at least one byte's worth of rent, so that no
exact-funding match is available. Note the condition carefully: a pre-sized genesis does NOT rescue this row,
because under the bounds model the genesis size is only a lower bound and cannot pin anything on its own. That makes
the concession wider than a best-first anchor model would admit. It is still narrow in practice, because the
canonical client never over-funds - every creation path funds at exactly `getMinimumBalance(96 + data.length)`
(`createBuffer.ts:51`, `createMetadata.ts:102` and `:120`).

Note where the divergence clusters. On a recent transaction with intact history the two verdicts are identical and
the extra code buys nothing visible. All of the value sits in historical views with pruned tails.

Properties, independent of scenario:

| Dimension | Write extent | Anchored |
|---|---|---|
| Length source | the surviving writes | a size replay (lower bound) met against the rent balance (upper bound) |
| Tail truncation | invisible, renders as complete | detected, the bounds fail to meet or the proven size is longer |
| Interior gap | detectable in principle, unchecked in both prior implementations | detected |
| Extra RPC calls | none | one cached `getMinimumBalanceForRentExemption`, every other input rides on fetched txs |
| Extra latency | none | one cached rent lookup, and the pre-paging shortcut below can REDUCE the total |
| Code size | 40-60 lines | 120-160 lines, split into paging, `deriveLength` and `assemble` |
| Can filter the replay to PMP-only ixs | yes | no, the genesis size and the funding transfer live outside the program |
| Length depends on retention | yes | no for the live read and the rent bound, yes for the size replay |
| Always renders a document | yes | no, some views become an explicit best-effort banner |
| Correct when it reports complete | no guarantee | yes, and only when the two bounds meet |

**Verdict.** Anchored. The gain is not more recovered bytes, it is that a wrong answer becomes a visible one, and
the cost is roughly 80 lines of pure unit-testable function plus one cached rent lookup. For an explorer the
decisive fact is that a truncated IDL rendered as a complete IDL is worse than no IDL, because the reader has no
signal to distrust it.

## Approach 1: write extent

Shared shape first, used by both approaches so the diff between them stays visible.

```ts
import { type Address } from '@solana/kit';

const HEADER_LEN = 96;
const ACCOUNT_STORAGE_OVERHEAD = 128;
// 3480 lamports per byte-year x a 2.0 exemption threshold. Verified against kit's
// getMinimumBalanceForRentExemption (dist/index.node.mjs:162-168), not a magic number.
const LAMPORTS_PER_BYTE_X2 = 6960n;

type WriteIx = {
    offset: number; // logical 0-based data offset. No +96, that is a raw-account-slicing detail.
    chunk?: Uint8Array; // absent when the write copied from a sourceBuffer, so bytes were never in the tx
    sourceBuffer?: Address;
    slot: number;
    signature: string;
    txIndex?: number; // present only on the Triton getTransactionsForAddress fast path
    ixIndex: number;
};

type Range = { start: number; end: number; by: WriteIx };
type Status = 'complete' | 'incomplete' | 'ambiguous' | 'best-effort';

type Reconstruction = {
    bytes: Uint8Array;
    dataLength: number;
    anchor: LengthAnchor | null;
    status: Status;
    reason?: string;
};

function extentOf(writes: WriteIx[]): number {
    return writes.reduce((max, w) => (w.chunk ? Math.max(max, w.offset + w.chunk.length) : max), 0);
}

function byExecutionOrder(a: WriteIx, b: WriteIx): number {
    if (a.slot !== b.slot) return a.slot - b.slot;
    if (a.txIndex !== undefined && b.txIndex !== undefined && a.txIndex !== b.txIndex) return a.txIndex - b.txIndex;
    if (a.signature === b.signature) return a.ixIndex - b.ixIndex; // one transaction, so the ix index orders them
    // Same slot, different transactions, no txIndex. NOT orderable. Comparing ixIndex across two transactions is
    // meaningless in exactly the case where order matters, so fall back to a stable and explicitly arbitrary
    // tie-break that keeps output deterministic, and let isOrdered flag any conflict between the two as ambiguous.
    return a.signature.localeCompare(b.signature);
}

/** True when execution order between two writes is decidable from the keys the current path carries. */
function isOrdered(a: WriteIx, b: WriteIx): boolean {
    if (a.slot !== b.slot) return true;
    if (a.txIndex !== undefined && b.txIndex !== undefined && a.txIndex !== b.txIndex) return true; // fast path
    return a.signature === b.signature; // same tx, so the ix index orders them
}

function intersects(a: Range, b: Range): boolean {
    return a.start < b.end && b.start < a.end;
}

/** Compare the two CHUNKS on their intersection. Never compare a chunk against the accumulated buffer. */
function sameBytesOnIntersection(a: Range, b: Range): boolean {
    const from = Math.max(a.start, b.start);
    const to = Math.min(a.end, b.end);
    for (let i = from; i < to; i++) {
        if (a.by.chunk![i - a.start] !== b.by.chunk![i - b.start]) return false;
    }
    return true;
}

/**
 * Offset-patch in execution order into a fixed-size buffer. Identical for both approaches.
 *
 * Two phases, deliberately decoupled. Classifying conflicts while patching would compare the incoming chunk
 * against the ACCUMULATED buffer while attributing the conflict to one prior write, so with three or more
 * overlapping writes it tests the wrong pair. Worked failure: A at slot 5 sig X ixIndex 0 writes 0xAA over [0, 8),
 * C at slot 5 sig X ixIndex 1 writes 0xBB, B at slot 5 sig Y ixIndex 2 writes 0xBB. By the time B is compared the
 * buffer already holds C's 0xBB, so nothing differs and nothing is flagged, even though A and B genuinely conflict
 * and are unorderable. Classifying every intersecting PAIR directly, chunk against chunk, cannot miss that.
 */
function patch(writes: WriteIx[], dataLength: number) {
    const covered: Range[] = writes
        .filter(w => w.chunk !== undefined)
        .map(w => ({ by: w, end: w.offset + w.chunk!.length, start: w.offset }));

    // Phase 1, classify. Every pair, chunk against chunk, in a loop that never touches `bytes`.
    let ambiguous = false;
    for (let i = 0; i < covered.length; i++) {
        for (let j = i + 1; j < covered.length; j++) {
            if (!intersects(covered[i], covered[j])) continue; // disjoint, so fetch order cannot matter
            if (sameBytesOnIntersection(covered[i], covered[j])) continue; // idempotent retry, not a conflict
            if (isOrdered(covered[i].by, covered[j].by)) continue; // last writer wins, the sort below resolves it
            ambiguous = true;
        }
    }

    // Phase 2, patch. Clipped to dataLength, because a derived length can sit below a recovered write's extent.
    const bytes = new Uint8Array(Math.max(0, dataLength));
    for (const r of [...covered].sort((a, b) => byExecutionOrder(a.by, b.by))) {
        if (r.start >= bytes.length) continue;
        bytes.set(r.by.chunk!.subarray(0, Math.min(r.end - r.start, bytes.length - r.start)), r.start);
    }
    return { ambiguous, bytes, covered };
}

function coversFully(covered: Range[], dataLength: number): boolean {
    // No dataLength === 0 special case. A legitimately empty payload IS fully covered by zero writes, and
    // short-circuiting to false here would make it permanently incomplete with no way to ever satisfy the check.
    let reach = 0;
    for (const r of [...covered].sort((a, b) => a.start - b.start)) {
        if (r.start > reach) return false; // interior gap
        reach = Math.max(reach, r.end);
    }
    return reach >= dataLength;
}
```

The extent approach itself. This is what `@solana/idl` and PR #90 do, cleaned up and GIVEN the coverage check that
neither of them actually has, so the comparison is fair rather than a strawman.

```ts
function reconstructByExtent(writes: WriteIx[]): Reconstruction {
    // The whole difference lives on this line. The target is read back out of the same writes that are
    // about to be measured against it, which is what makes the check below circular.
    const dataLength = extentOf(writes);

    const { ambiguous, bytes, covered } = patch(writes, dataLength);

    // Not useless, it catches an INTERIOR gap. It is structurally incapable of catching a missing TAIL,
    // because a pruned tail lowers dataLength by exactly the amount it then fails to cover.
    const status: Status = coversFully(covered, dataLength) ? 'complete' : 'incomplete';

    return { anchor: null, bytes, dataLength, status: ambiguous ? 'ambiguous' : status };
}
```

## Approach 2: anchored

Two pure seams. `deriveLength` decides the target, `reconstructAnchored` decides the verdict. Neither accepts a
caller-supplied length, so no caller can obtain a complete verdict for an unpinned reconstruction.

```ts
type Provenance = { lower: 'size-replay'; upper: 'rent-bound' };
type LengthAnchor = { dataLength: number; provenance: Provenance };

type AnchorInputs = {
    // Forward size simulation in execution order over creation, allocate, extend and `write` auto-grow. A LOWER
    // bound. It replaces the old independent genesisSpace and extendedSize accumulators, because `extend` adds to
    // whatever size the account already has and `96 + sum(extend.length)` undercounts one that grew by `write`.
    replayedSize?: number;
    balances: bigint[]; // every non-zero balance observed for the account at or before the viewed instruction
    coverage: number; // extentOf(writes). A lower bound too, never the answer.
};

type LengthBounds = {
    lowerSize: number; // the greatest lower bound the replay could establish
    upperSize: number | null; // the rent bound, null when none was observed or it was declined
    proven: boolean; // upperSize came from an exact-funding match, so it IS the size and not merely a ceiling
    declinedRentBound: number | null; // an upper bound below the lower bound, impossible, so not applied
    pinned: boolean; // lowerSize === upperSize on a proven bound. The only state that may report complete.
    dataLength: number; // the length to size the buffer at. Rendering it is fine, calling it complete is not.
    provenance: Provenance | null;
};

/** Largest account size whose rent-exempt minimum is still <= `lamports`, under the local rate. A proposal only. */
function sizeUpperBoundFromLamports(lamports: bigint): number {
    return Number(lamports / LAMPORTS_PER_BYTE_X2) - ACCOUNT_STORAGE_OVERHEAD;
}

/**
 * Derive the interval the account SIZE is known to lie in. There is no preferred anchor and no best-first list.
 * Every retention-dependent observation folds into ONE lower bound, and the rent-exempt balance is the only upper
 * bound. `confirmRent` is getMinimumBalanceForRentExemption, cached by the caller, because the local 6960 is a
 * genesis-configurable default that SIMD-0194 restated and a drifted rate would silently move the bound.
 */
async function deriveLength(
    input: AnchorInputs,
    confirmRent: (size: number) => Promise<bigint>,
): Promise<LengthBounds> {
    // Every lower bound at once. Retention can only make a lower bound too SMALL, so the max of them is sound.
    const lowerSize = Math.max(HEADER_LEN, input.replayedSize ?? HEADER_LEN, input.coverage + HEADER_LEN);

    const maxBalance = input.balances.reduce((max, b) => (b > max ? b : max), 0n);
    if (maxBalance === 0n) {
        // No non-zero balance observed at or after the account reached its final size. An account may grow and
        // close inside one transaction with no top-up, and a zero post-balance is an allowed rent state, so this
        // is an expected outcome rather than an error. No upper bound means nothing can pin the length.
        return unpinned(lowerSize, null, null);
    }

    const candidate = sizeUpperBoundFromLamports(maxBalance);
    if (candidate < lowerSize) {
        // Impossible for a rent-exempt account of the replayed size, so the balance window holds no observation
        // taken at or after the account reached its final size. DECLINE the upper bound. Nothing may shorten the
        // reconstruction below the replayed size, so this is never applied as a length.
        return unpinned(lowerSize, null, candidate);
    }

    // One rule for the rent bound, and it is the exact-funding test, not an equality against coverage. An exact fit
    // against the chain's own rent parameters means the account was funded for exactly this size, so the bound is a
    // proven SIZE. That is why it is honoured even when it lands ABOVE coverage, which is the pruned-tail case and
    // the whole reason a pruned tail is detectable at all. An equality-against-coverage test can never see one.
    if ((await confirmRent(candidate)) !== maxBalance) {
        // Over-funded by at least one byte's worth of rent. Still a sound ceiling, but a ceiling cannot set a
        // length, so it cannot pin one either.
        return unpinned(lowerSize, candidate, null);
    }

    const pinned = candidate === lowerSize;
    return {
        dataLength: candidate - HEADER_LEN, // a proven size, so size against it and let the coverage check speak
        declinedRentBound: null,
        lowerSize,
        pinned,
        provenance: pinned ? { lower: 'size-replay', upper: 'rent-bound' } : null,
        proven: true,
        upperSize: candidate,
    };
}

function unpinned(lowerSize: number, upperSize: number | null, declinedRentBound: number | null): LengthBounds {
    // Size against the lower bound when nothing pins the length, which is what approach 1 does unconditionally.
    // The difference is that this path can never call the result complete.
    return {
        dataLength: lowerSize - HEADER_LEN,
        declinedRentBound,
        lowerSize,
        pinned: false,
        provenance: null,
        proven: false,
        upperSize,
    };
}

/**
 * A sourceBuffer write has no known extent, so `Range` is unconstructible for it - there is no `end` to supply and
 * a zero-length range would claim it covered nothing. Everything from its offset to the end of the payload is
 * potentially its content, so the earliest such offset opens an unbounded unrecoverable TAIL.
 */
function unrecoverableTail(unrecoverable: WriteIx[]): number | null {
    return unrecoverable.length > 0 ? Math.min(...unrecoverable.map(w => w.offset)) : null;
}

async function reconstructAnchored(
    writes: WriteIx[],
    inputs: Omit<AnchorInputs, 'coverage'>,
    unrecoverable: WriteIx[],
    confirmRent: (size: number) => Promise<bigint>,
): Promise<Reconstruction> {
    const coverage = extentOf(writes);
    const length = await deriveLength({ ...inputs, coverage }, confirmRent);
    const dataLength = length.dataLength;

    const { ambiguous, bytes, covered } = patch(writes, dataLength);
    const anchor = length.pinned ? { dataLength, provenance: length.provenance! } : null;

    const tail = unrecoverableTail(unrecoverable);
    if (tail !== null) {
        const reason = `a write copied from a source buffer at offset ${tail}, so [${tail}, ${dataLength}) is
            unrecoverable and its length is unknown`;
        return { anchor, bytes, dataLength, reason, status: 'incomplete' };
    }
    if (!coversFully(covered, dataLength)) {
        // Reachable now, because dataLength no longer moves with the writes.
        const reason = `writes cover ${coverage} of ${dataLength}`;
        return { anchor, bytes, dataLength, reason, status: 'incomplete' };
    }
    if (ambiguous) {
        return { anchor, bytes, dataLength, reason: 'same-slot conflicting overlap', status: 'ambiguous' };
    }
    if (!length.pinned) {
        const declined =
            length.declinedRentBound !== null
                ? `, rent bound ${length.declinedRentBound} declined as below the replayed size`
                : '';
        const bound = length.upperSize ?? 'unbounded';
        const reason = `length not pinned: size in [${length.lowerSize}, ${bound}]${declined}`;
        return { anchor, bytes, dataLength, reason, status: 'best-effort' };
    }
    return { anchor, bytes, dataLength, status: 'complete' };
}
```

Note the verdict ordering. `incomplete` outranks `best-effort`, so an unpinned length whose shortfall shows up as a
concrete coverage gap reports the stronger label. `best-effort` is what is left when the bounds fail to meet and
there is no gap to point at.

Collecting the bound inputs. This is the part that forces the replay to stop filtering to PMP-only instructions,
which is the real structural cost of the approach.

```ts
/**
 * Forward-simulate the account size and gather the balance window deriveLength consumes. Three things this must
 * get right, and a single newest-first pass over the signature list gets all three wrong: walk in EXECUTION order
 * and bound the walk at the viewed instruction's execution POSITION, reset every accumulator on `close` because
 * the address can be reused, and never carry a balance across a lifecycle boundary.
 */
function collectAnchorInputs(txs: RawTx[], account: Address, viewed: Position): Omit<AnchorInputs, 'coverage'> {
    let replayedSize = 0;
    let balances: bigint[] = [];

    // getSignaturesForAddress returns NEWEST FIRST and every accumulator below is order-sensitive.
    for (const tx of [...txs].sort(byTxOrder)) {
        if (tx.err) continue; // a failed transaction changed nothing
        const position = atOrBeforeViewed(tx, viewed);
        if (position === false) continue;
        // null means same slot, different transaction, no transactionIndex, so it cannot be ordered against the
        // viewed one. EXCLUDE it and flag the result. A `slot <= viewedSlot` bound would instead fold a later
        // transaction's bytes into the payload attributed to the viewed instruction.
        if (position === null) continue;

        // Free. meta.preBalances and meta.postBalances are already on every tx the replay fetched.
        balances.push(...balancesOf(tx, account));

        for (const ix of instructionsOf(tx)) {
            // Inside the viewed transaction the walk stops at the viewed instruction. `setData` and the buffer's
            // `close` routinely share one transaction, and processing that `close` would wipe the session.
            if (tx.signature === viewed.signature && ix.ixIndex >= viewed.ixIndex) continue;

            // NOT PMP-only. The genesis size is a System createAccount and the PDA funding is a System transfer,
            // so a `programId === PMP` filter would structurally never see either of them.
            if (ix.programId === SYSTEM_PROGRAM_ADDRESS) {
                // createAccount ix data is u32 disc + u64 lamports + u64 space, so space sits at [12, 20).
                // The created account is at ACCOUNT INDEX 1, not 0.
                if (readU32LE(ix.data, 0) === SystemDisc.CreateAccount && ix.accounts[1] === account) {
                    replayedSize = Number(readU64LE(ix.data, 12));
                }
                continue;
            }
            if (ix.programId !== PMP_PROGRAM_ADDRESS || ix.accounts[0] !== account) continue;

            switch (ix.data[0]) {
                case PmpDisc.Close:
                    // Without this reset a new lifecycle at a reused address inherits the previous one's size and,
                    // worse, its balances, which are then read as an upper bound on the new payload.
                    replayedSize = 0;
                    balances = [];
                    break;
                case PmpDisc.Allocate:
                    // allocate creates the account at exactly the header size and leaves an already-sized account
                    // alone, so it can only ever raise the size to HEADER_LEN.
                    replayedSize = Math.max(replayedSize, HEADER_LEN);
                    break;
                case PmpDisc.Extend:
                    // extend ADDS to the size the account already has. An independent `96 + sum(extend.length)`
                    // accumulator undercounts an account that grew by `write` first.
                    replayedSize += readU16LE(ix.data, 1);
                    break;
                case PmpDisc.Write:
                    // write auto-grows: required = max(data_len, 96 + offset + chunk.length).
                    replayedSize = Math.max(replayedSize, HEADER_LEN + writeExtentOf(ix));
                    break;
            }
        }
    }

    return { balances: balances.filter(b => b > 0n), replayedSize: replayedSize || undefined };
}
```

The pre-paging shortcut. For a canonical-client buffer the upper bound is available before a single signature is
fetched, because the buffer sits in the viewed transaction's account list and was funded at exactly
`getMinimumBalance(96 + N)`.

```ts
/**
 * Derive the payload length from the viewed transaction alone. One cached rent lookup and no signature paging, and
 * independent of write-history retention, so it holds even when every write tx has been pruned. This is the SAME
 * exact-funding rule deriveLength applies, run against one balance instead of the whole window, so the two can
 * never disagree. Confirm against the chain's real rent parameters rather than trusting the local 6960.
 */
async function anchorFromViewedTx(rpc: Rpc, viewedTx: RawTx, account: Address): Promise<number | null> {
    const observed = preBalanceOf(viewedTx, account);
    if (observed === undefined || observed === 0n) return null;
    const size = sizeUpperBoundFromLamports(observed);
    if (size < HEADER_LEN) return null;
    const required = await rpc.getMinimumBalanceForRentExemption(size).send();
    return required === observed ? size - HEADER_LEN : null; // an exact fit means the account was funded exactly
}
```

With the target known up front, paging becomes bounded work: stop as soon as coverage reaches it, report incomplete
the moment the signature cap is hit short of it, and show the real payload size in the UI while fetching rather
than a bare spinner.
