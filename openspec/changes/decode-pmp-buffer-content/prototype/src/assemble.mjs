// Offset-patch assembly with range classification and a coverage check.
// Pure. No RPC. This is the unit the design calls `assemble(writes, anchor)`.

import { HEADER_LEN } from './decode-ix.mjs';
import { deriveLength, deriveLengthAsDesigned } from './anchor.mjs';

/**
 * Execution order. `slot` always exists. `txIndex` exists only on the Triton fast path. `sig` identifies the
 * transaction, so two writes inside one transaction are always ordered by `ixIndex` even without `txIndex`.
 */
function compareOrder(a, b) {
    if (a.slot !== b.slot) return a.slot - b.slot;
    if (a.txIndex != null && b.txIndex != null && a.txIndex !== b.txIndex) return a.txIndex - b.txIndex;
    if (a.sig === b.sig) return a.ixIndex - b.ixIndex;
    // Same slot, different transactions, no txIndex. Not orderable. Keep it stable so output is deterministic,
    // but the caller must treat any conflict between these two as ambiguous.
    return String(a.sig).localeCompare(String(b.sig));
}

function orderable(a, b) {
    if (a.slot !== b.slot) return true;
    if (a.txIndex != null && b.txIndex != null && a.txIndex !== b.txIndex) return true;
    return a.sig === b.sig;
}

function intersects(a, b) {
    return a.offset < b.offset + b.length && b.offset < a.offset + a.length;
}

function sameBytesOnIntersection(a, b) {
    const from = Math.max(a.offset, b.offset);
    const to = Math.min(a.offset + a.length, b.offset + b.length);
    for (let i = from; i < to; i++) {
        if (a.chunk[i - a.offset] !== b.chunk[i - b.offset]) return false;
    }
    return true;
}

/** Merge [start, end) ranges and return the gaps inside [0, limit). */
function gapsIn(ranges, limit) {
    const sorted = [...ranges].filter(r => r.length > 0).sort((x, y) => x.offset - y.offset);
    const gaps = [];
    let cursor = 0;
    for (const r of sorted) {
        if (r.offset > cursor) gaps.push({ length: Math.min(r.offset, limit) - cursor, offset: cursor });
        cursor = Math.max(cursor, r.offset + r.length);
        if (cursor >= limit) break;
    }
    if (cursor < limit) gaps.push({ length: limit - cursor, offset: cursor });
    return gaps.filter(g => g.length > 0);
}

export function extentOf(writes) {
    return writes.reduce((max, w) => Math.max(max, w.offset + w.length), 0);
}

/**
 * @param writes         [{offset, chunk, slot, txIndex?, sig, ixIndex}] recoverable write chunks, any order
 * @param unrecoverable  [{offset, slot, txIndex?, sig, ixIndex}] sourceBuffer writes; length is UNKNOWN by
 *                       construction, since the bytes live in another account
 * @param observations   {genesisSpace, extendedSize, balances}
 * @param mode           'corrected' | 'as-designed'
 */
export function assemble(writes, unrecoverable, observations, mode = 'corrected') {
    const ranges = writes.map(w => ({ ...w, length: w.chunk.length }));
    const coverage = extentOf(ranges);

    const length =
        mode === 'as-designed'
            ? deriveLengthAsDesigned({ ...observations, coverage })
            : deriveLength({ ...observations, coverage });

    const reasons = [];
    let ambiguous = false;

    // Classify every intersecting pair.
    for (let i = 0; i < ranges.length; i++) {
        for (let j = i + 1; j < ranges.length; j++) {
            if (!intersects(ranges[i], ranges[j])) continue;
            if (sameBytesOnIntersection(ranges[i], ranges[j])) continue; // idempotent retry, not a conflict
            if (orderable(ranges[i], ranges[j])) continue; // last writer wins, resolved by the sort below
            ambiguous = true;
            reasons.push(
                `conflicting overlap at [${Math.max(ranges[i].offset, ranges[j].offset)}..) cannot be ordered ` +
                    `(slot ${ranges[i].slot}, two transactions, no transactionIndex)`,
            );
        }
    }

    const dataLength = mode === 'as-designed' ? (length ? length.dataLength : coverage) : length.renderLength;

    if (mode !== 'as-designed' && !length.pinned) {
        reasons.push(
            `length not pinned: size in [${length.lowerSize}, ${length.upperSize ?? 'unbounded'}]` +
                (length.declinedRentBound != null
                    ? `, rent bound ${length.declinedRentBound} declined (no balance observed at or after the ` +
                      `account reached its final size)`
                    : ''),
        );
    }
    if (mode === 'as-designed' && !length) {
        reasons.push('no anchor available');
    }

    // Patch in execution order. For disjoint ranges this is a no-op reordering; for an orderable conflict it is
    // what makes the later write win.
    const bytes = new Uint8Array(Math.max(0, dataLength));
    for (const w of [...ranges].sort(compareOrder)) {
        if (w.offset >= bytes.length) continue;
        bytes.set(w.chunk.subarray(0, Math.min(w.length, bytes.length - w.offset)), w.offset);
    }

    const beyond = ranges.filter(w => w.offset + w.length > dataLength);
    if (beyond.length > 0) {
        reasons.push(`${beyond.length} write(s) extend past the derived length ${dataLength}`);
    }

    // An unrecoverable sourceBuffer write has NO known length, so everything from its offset to the end of the
    // payload is potentially its content. Treat the whole tail as unrecoverable, not a zero-length range.
    const holes = gapsIn(ranges, dataLength);
    const unrecoverableTail = unrecoverable.length > 0 ? Math.min(...unrecoverable.map(u => u.offset)) : null;
    if (unrecoverableTail != null) {
        reasons.push(
            `write from a sourceBuffer at offset ${unrecoverableTail}: bytes are not in any transaction, and its ` +
                `length is unknown, so [${unrecoverableTail}, ${dataLength}) is unrecoverable`,
        );
    }
    if (holes.length > 0) {
        reasons.push(`coverage gap(s): ${holes.map(g => `[${g.offset}, ${g.offset + g.length})`).join(', ')}`);
    }
    if (!observations.sawGenesis) {
        reasons.push('genesis (System createAccount / allocate) not observed in the retained history');
    }

    let status = 'complete';
    if (holes.length > 0 || unrecoverableTail != null || !observations.sawGenesis) status = 'incomplete';
    else if (ambiguous) status = 'ambiguous';
    else if (mode === 'as-designed' ? !length : !length.pinned) status = 'best-effort';

    return {
        anchor:
            mode === 'as-designed'
                ? length
                : length.pinned
                  ? { dataLength: length.dataLength, provenance: length.provenance }
                  : null,
        bytes,
        coverage,
        dataLength,
        length,
        reason: reasons.join('; ') || undefined,
        status,
    };
}

export { HEADER_LEN };
