// The replay driver. Takes an already-fetched transaction list (so it is RPC-free and unit-testable) and produces
// the observation set that `assemble` consumes.
//
// A transaction here is the shape both RPC paths can produce:
//   { sig, slot, txIndex?, err?, balances: {pre, post}, ixs: [{ program, disc, ixIndex, inner?, ... }] }
// `txIndex` is present only on the Triton getTransactionsForAddress fast path.
// `inner` marks an instruction that came from meta.innerInstructions (a CPI), which the design never mentions.
//
// `mode: 'as-designed'` follows design.md §4.2's pseudo-code literally (newest-first iteration, no sort, a
// `slot <= maxSlot` filter, whole-transaction processing, outer instructions only, independent genesis/extend
// accumulators). `mode: 'corrected'` is the version the fixtures show is needed.

import { assemble } from './assemble.mjs';
import { DISCRIMINATOR, HEADER_LEN, PMP_PROGRAM_ID, SYSTEM_PROGRAM_ID } from './decode-ix.mjs';

function compareTx(a, b) {
    if (a.slot !== b.slot) return a.slot - b.slot;
    if (a.txIndex != null && b.txIndex != null) return a.txIndex - b.txIndex;
    return String(a.sig).localeCompare(String(b.sig));
}

/** true / false / null, where null means "same slot, different transaction, and no intra-slot index to order it". */
function atOrBeforeViewed(tx, viewed) {
    if (tx.slot < viewed.slot) return true;
    if (tx.slot > viewed.slot) return false;
    if (tx.sig === viewed.sig) return true;
    if (tx.txIndex != null && viewed.txIndex != null) return tx.txIndex <= viewed.txIndex;
    return null;
}

/**
 * `mode` drives the REPLAY (ordering, scoping, which instructions are walked). `anchorMode` drives the LENGTH
 * derivation. They are separate axes so a fixture can isolate one from the other.
 */
export function replay(txs, { viewed, mode = 'corrected', anchorMode = mode }) {
    // The fallback path receives signatures NEWEST FIRST from getSignaturesForAddress. design.md §4.2's snippet
    // iterates them in that order without sorting, which breaks every order-sensitive accumulator below.
    const ordered = mode === 'as-designed' ? txs : [...txs].sort(compareTx);

    const writes = [];
    const unrecoverable = [];
    const balances = [];
    let sawGenesis = false;
    const notes = [];

    // Forward simulation of the account size, which is the lower bound the corrected derivation uses.
    let size = 0;
    // The two independent accumulators design.md's snippet keeps instead, retained for the as-designed comparison.
    let genesisSpace = null;
    let extendedSize = null;

    for (const tx of ordered) {
        if (tx.err) continue; // a failed transaction changed nothing
        const position = atOrBeforeViewed(tx, viewed);
        if (position === false) continue;
        if (position === null) {
            // `slot <= viewedSlot` silently INCLUDES a same-slot transaction that executed AFTER the viewed
            // setData, folding later bytes into the payload attributed to it.
            notes.push(`same-slot transaction ${tx.sig} is not orderable against the viewed transaction`);
            if (mode !== 'as-designed') continue;
        }

        if (tx.balances != null) balances.push(tx.balances.pre, tx.balances.post);

        for (const ix of tx.ixs) {
            // Inside the viewed transaction, replay must stop at the viewed instruction. `setData` and the
            // buffer's `close` routinely share one transaction, and processing that `close` wipes the session.
            if (mode !== 'as-designed' && tx.sig === viewed.sig && ix.ixIndex >= viewed.ixIndex) continue;
            // A CPI write/setData lives in meta.innerInstructions, which the design never walks.
            if (ix.inner && mode === 'as-designed') continue;

            const order = { ixIndex: ix.ixIndex, sig: tx.sig, slot: tx.slot, txIndex: tx.txIndex };

            if (ix.program === SYSTEM_PROGRAM_ID && ix.disc === 'createAccount') {
                size = ix.space;
                // A creation at exactly the header size is not a pre-size, it is just genesis.
                genesisSpace = ix.space > HEADER_LEN ? ix.space : null;
                sawGenesis = true;
                continue;
            }
            if (ix.program !== PMP_PROGRAM_ID) continue;

            switch (ix.disc) {
                case DISCRIMINATOR.Close:
                    writes.length = 0;
                    unrecoverable.length = 0;
                    balances.length = 0;
                    size = 0;
                    genesisSpace = null;
                    extendedSize = null;
                    sawGenesis = false;
                    break;
                case DISCRIMINATOR.Allocate:
                    // allocate creates the account at exactly the header size, and leaves an already-sized
                    // account alone (processor/allocate.rs only creates space in its data_len() == 0 arm).
                    size = Math.max(size, HEADER_LEN);
                    sawGenesis = true;
                    break;
                case DISCRIMINATOR.Extend:
                    // extend ADDS to the current size. An independent `96 + sum(extend)` undercounts an account
                    // that grew by `write` first.
                    size += ix.length;
                    extendedSize = (extendedSize ?? HEADER_LEN) + ix.length;
                    break;
                case DISCRIMINATOR.Write:
                    // write auto-grows: required_length = max(data.len(), offset + 96 + chunk.len()).
                    if (ix.chunk === undefined) {
                        unrecoverable.push({ ...order, offset: ix.offset });
                    } else {
                        size = Math.max(size, ix.offset + HEADER_LEN + ix.chunk.length);
                        writes.push({ ...order, chunk: ix.chunk, offset: ix.offset });
                    }
                    break;
                default:
                    break;
            }
        }
    }

    const result = assemble(
        writes,
        unrecoverable,
        { balances, extendedSize, genesisSpace, replayedSize: size || null, sawGenesis },
        anchorMode,
    );
    return { ...result, notes, replayedSize: size };
}
