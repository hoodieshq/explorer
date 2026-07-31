// Fixture runner. `node openspec/changes/decode-pmp-buffer-content/prototype/test/run.mjs`
//
// Sections:
//   1. instruction shapes  - against the real @solana-program/program-metadata decoders
//   2. design.md §9        - the fixture list the design says reconstruction must satisfy
//   3. design.md §4.2      - the length-anchor fixtures
//   4. holes               - cases where design.md as written reports `complete` for content that is not
//   5. bounded inflate     - design.md §3's snippet, executed

import pako from 'pako';

import { decodeSetDataConfig, HEADER_LEN, PMP_PROGRAM_ID, parseWrite, SYSTEM_PROGRAM_ID } from '../src/decode-ix.mjs';
import { boundedUncompress, boundedUncompressAsDesigned, PayloadTooLargeError } from '../src/inflate.mjs';
import { replay } from '../src/replay.mjs';

const results = [];
function check(section, name, expectation, actual, detail) {
    const ok = expectation === actual;
    results.push({ actual, detail, expected: expectation, name, ok, section });
}
const bytes = (fill, len) => new Uint8Array(len).fill(fill);
const rentFor = size => (128 + size) * 3480 * 2;

// ---------------------------------------------------------------------------------------------------------------
// transaction builders

let sigCounter = 0;
const nextSig = () => `sig${++sigCounter}`;

function tx({ slot, txIndex, sig = nextSig(), err, balance, ixs }) {
    return { balances: balance, err, ixs: ixs.map((ix, i) => ({ ixIndex: i, ...ix })), sig, slot, txIndex };
}
const createAccount = space => ({ disc: 'createAccount', program: SYSTEM_PROGRAM_ID, space });
const allocate = () => ({ disc: 7, program: PMP_PROGRAM_ID });
const extend = length => ({ disc: 8, length, program: PMP_PROGRAM_ID });
const close = () => ({ disc: 6, program: PMP_PROGRAM_ID });
const write = (offset, chunk, extra = {}) => ({ chunk, disc: 0, offset, program: PMP_PROGRAM_ID, ...extra });
const sourceWrite = offset => ({ chunk: undefined, disc: 0, offset, program: PMP_PROGRAM_ID });
const setData = () => ({ disc: 3, program: PMP_PROGRAM_ID });

/** The common shape: keypair buffer created pre-sized, chunked writes, setData + close in the viewed transaction. */
function preSizedBufferScenario({ payload, chunkSize = 4, dropTail = 0, slotBase = 100 }) {
    const space = HEADER_LEN + payload.length;
    const txs = [
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: slotBase }),
    ];
    const chunks = [];
    for (let off = 0; off < payload.length; off += chunkSize) {
        chunks.push({ chunk: payload.slice(off, off + chunkSize), offset: off });
    }
    const kept = dropTail > 0 ? chunks.slice(0, -dropTail) : chunks;
    kept.forEach((c, i) => {
        txs.push(
            tx({
                balance: { post: rentFor(space), pre: rentFor(space) },
                ixs: [write(c.offset, c.chunk)],
                slot: slotBase + 1 + i,
            }),
        );
    });
    const viewedSig = nextSig();
    const viewedSlot = slotBase + 1 + chunks.length;
    txs.push(
        tx({
            balance: { post: 0, pre: rentFor(space) },
            ixs: [setData(), close()],
            sig: viewedSig,
            slot: viewedSlot,
        }),
    );
    return { txs, viewed: { ixIndex: 0, sig: viewedSig, slot: viewedSlot } };
}

// ---------------------------------------------------------------------------------------------------------------
// 1. instruction shapes

const S1 = '1. instruction shapes';
try {
    const cfg = decodeSetDataConfig(new Uint8Array([3, 1, 0, 1]));
    check(S1, '4-byte setData decodes as header-only, no throw', true, cfg.headerOnly && cfg.dataSource === undefined);
} catch (e) {
    check(S1, '4-byte setData decodes as header-only, no throw', true, false, e.message);
}
try {
    const cfg = decodeSetDataConfig(new Uint8Array([3, 1, 0, 1, 0, 65, 66]));
    check(S1, '5+N setData yields inline data', 2, cfg.data ? cfg.data.length : -1);
} catch (e) {
    check(S1, '5+N setData yields inline data', 2, -1, e.message);
}
{
    const w = parseWrite({ accounts: ['buf', 'auth', PMP_PROGRAM_ID], data: new Uint8Array([0, 5, 0, 0, 0, 9, 9]) });
    check(S1, 'write with inline chunk', '5/2/false', `${w.offset}/${w.data.length}/${w.fromSourceBuffer}`);
}
{
    const w = parseWrite({ accounts: ['buf', 'auth', 'srcBuffer'], data: new Uint8Array([0, 5, 0, 0, 0]) });
    check(S1, 'write copying from a sourceBuffer', 'true/undefined', `${w.fromSourceBuffer}/${w.data}`);
}

// ---------------------------------------------------------------------------------------------------------------
// 2. design.md §9 reconstruction fixtures

const S2 = '2. design.md §9';
const payload = new Uint8Array(16).map((_, i) => i + 1);

{
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 4, payload });
    const inOrder = replay(txs, { viewed });
    const shuffled = replay([...txs].reverse(), { viewed });
    check(S2, 'out-of-order disjoint writes assemble identically', true, `${inOrder.bytes}` === `${shuffled.bytes}`);
    check(S2, 'in-order assembly is complete', 'complete', inOrder.status, inOrder.reason);
    check(S2, 'assembled bytes match the payload', `${payload}`, `${inOrder.bytes}`);
}
{
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 4, payload });
    const dup = txs[2];
    txs.push(tx({ balance: dup.balances, ixs: [write(0, payload.slice(0, 4))], slot: dup.slot + 100 }));
    // duplicate lands before the viewed slot
    const r = replay(txs, { viewed: { ...viewed, slot: viewed.slot + 200 } });
    check(S2, 'duplicate write, same range same bytes -> complete', 'complete', r.status, r.reason);
}
{
    const space = HEADER_LEN + 8;
    const viewedSig = nextSig();
    const txs = [
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: 1 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0xaa, 8))], slot: 2 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0xbb, 8))], slot: 3 }),
        tx({ balance: { post: 0, pre: rentFor(space) }, ixs: [setData(), close()], sig: viewedSig, slot: 4 }),
    ];
    const r = replay(txs, { viewed: { ixIndex: 0, sig: viewedSig, slot: 4 } });
    check(S2, 'conflicting overlap across slots -> later slot wins', 'complete', r.status, r.reason);
    check(S2, 'conflicting overlap across slots -> bytes are the later ones', `${bytes(0xbb, 8)}`, `${r.bytes}`);
}
{
    const space = HEADER_LEN + 8;
    const viewedSig = nextSig();
    const base = txIndexed => [
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: 1 }),
        tx({
            balance: { post: rentFor(space), pre: rentFor(space) },
            ixs: [write(0, bytes(0xaa, 8))],
            sig: 'sameSlotA',
            slot: 2,
            txIndex: txIndexed ? 3 : undefined,
        }),
        tx({
            balance: { post: rentFor(space), pre: rentFor(space) },
            ixs: [write(0, bytes(0xbb, 8))],
            sig: 'sameSlotB',
            slot: 2,
            txIndex: txIndexed ? 9 : undefined,
        }),
        tx({
            balance: { post: 0, pre: rentFor(space) },
            ixs: [setData(), close()],
            sig: viewedSig,
            slot: 4,
            txIndex: txIndexed ? 1 : undefined,
        }),
    ];
    const fallback = replay(base(false), { viewed: { ixIndex: 0, sig: viewedSig, slot: 4 } });
    const fast = replay(base(true), { viewed: { ixIndex: 0, sig: viewedSig, slot: 4, txIndex: 1 } });
    check(S2, 'same-slot conflict, fallback -> ambiguous', 'ambiguous', fallback.status, fallback.reason);
    check(S2, 'same-slot conflict, fast path -> complete', 'complete', fast.status, fast.reason);
    check(S2, 'same-slot conflict, fast path -> later txIndex wins', `${bytes(0xbb, 8)}`, `${fast.bytes}`);
}
{
    const space = HEADER_LEN + 8;
    const viewedSig = nextSig();
    const txs = [
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: 1 }),
        tx({
            balance: { post: rentFor(space), pre: rentFor(space) },
            ixs: [write(0, bytes(0xaa, 8)), write(0, bytes(0xbb, 8))],
            slot: 2,
        }),
        tx({ balance: { post: 0, pre: rentFor(space) }, ixs: [setData(), close()], sig: viewedSig, slot: 3 }),
    ];
    const r = replay(txs, { viewed: { ixIndex: 0, sig: viewedSig, slot: 3 } });
    check(S2, 'conflict inside one tx -> resolved by ix index', 'complete', r.status, r.reason);
    check(S2, 'conflict inside one tx -> last ix wins', `${bytes(0xbb, 8)}`, `${r.bytes}`);
}
{
    // Buffer rewrite: a live buffer written again with SHORTER content, no allocate and no close between the sets.
    // trim on a buffer is a size no-op, so the stale tail survives and setData copies it.
    const space = HEADER_LEN + 8;
    const viewedSig = nextSig();
    const txs = [
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: 1 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0xaa, 8))], slot: 2 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0xbb, 4))], slot: 5 }),
        tx({ balance: { post: 0, pre: rentFor(space) }, ixs: [setData(), close()], sig: viewedSig, slot: 6 }),
    ];
    const r = replay(txs, { viewed: { ixIndex: 0, sig: viewedSig, slot: 6 } });
    const expected = new Uint8Array([0xbb, 0xbb, 0xbb, 0xbb, 0xaa, 0xaa, 0xaa, 0xaa]);
    check(S2, 'buffer rewrite -> newer set wins, stale tail retained', `${expected}`, `${r.bytes}`, r.reason);
}
{
    const space = HEADER_LEN + 8;
    const viewedSig = nextSig();
    const txs = [
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: 1 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0xaa, 4))], slot: 2 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [sourceWrite(4)], slot: 3 }),
        tx({ balance: { post: 0, pre: rentFor(space) }, ixs: [setData(), close()], sig: viewedSig, slot: 4 }),
    ];
    const r = replay(txs, { viewed: { ixIndex: 0, sig: viewedSig, slot: 4 } });
    check(S2, 'write from a sourceBuffer -> incomplete', 'incomplete', r.status, r.reason);
}
{
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 4, payload });
    txs.splice(2, 1); // drop an interior write
    const r = replay(txs, { viewed });
    check(S2, 'interior gap -> incomplete', 'incomplete', r.status, r.reason);
}
{
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 4, payload });
    txs.shift(); // history pruned past genesis
    const r = replay(txs, { viewed });
    check(S2, 'missing genesis -> incomplete', 'incomplete', r.status, r.reason);
}
{
    // 96-byte shift guard: writes carry the LOGICAL offset. Patching at offset + 96 would leave [0, 96) empty.
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 4, payload });
    const r = replay(txs, { viewed });
    check(S2, '96-byte shift guard: first byte is payload[0]', payload[0], r.bytes[0]);
    check(S2, '96-byte shift guard: assembled length is the payload length', payload.length, r.bytes.length);
}

// ---------------------------------------------------------------------------------------------------------------
// 3. design.md §4.2 length anchors

const S3 = '3. design.md §4.2 anchors';
{
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 4, dropTail: 1, payload });
    const r = replay(txs, { viewed });
    check(S3, 'pre-sized genesis + pruned tail -> incomplete', 'incomplete', r.status, r.reason);
    const asDesigned = replay(txs, { mode: 'as-designed', viewed });
    check(S3, '  (as-designed agrees here)', 'incomplete', asDesigned.status, asDesigned.reason);
}
{
    // extend-anchored: allocate creates 96 bytes, extends reserve the payload, no pre-size.
    const payloadBig = bytes(0x11, 12);
    const space = HEADER_LEN + payloadBig.length;
    const viewedSig = nextSig();
    const txs = [
        tx({ balance: { post: rentFor(HEADER_LEN), pre: 0 }, ixs: [createAccount(HEADER_LEN), allocate()], slot: 1 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(HEADER_LEN) }, ixs: [extend(12)], slot: 2 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0x11, 8))], slot: 3 }),
        tx({ balance: { post: 0, pre: rentFor(space) }, ixs: [setData(), close()], sig: viewedSig, slot: 5 }),
    ];
    const r = replay(txs, { viewed: { ixIndex: 0, sig: viewedSig, slot: 5 } });
    check(S3, 'extend anchor + pruned tail -> incomplete', 'incomplete', r.status, r.reason);
}
{
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 4, payload });
    const r = replay(txs, { viewed });
    check(
        S3,
        'rent bound equals coverage -> complete (length pinned)',
        true,
        r.length.pinned,
        JSON.stringify(r.anchor),
    );
}
{
    // Over-funded account: the balance permits a larger payload than the writes cover, so nothing pins the length.
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 4, payload });
    for (const t of txs) {
        if (t.balances) {
            t.balances = { post: t.balances.post ? t.balances.post + 10_000_000 : 0, pre: t.balances.pre + 10_000_000 };
        }
    }
    const r = replay(txs, { viewed });
    check(S3, 'over-funded account -> best-effort, never complete', 'best-effort', r.status, r.reason);
}
{
    // Rent bound BELOW the covered range: impossible, so the bound is declined rather than shrinking the payload.
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 4, payload });
    for (const t of txs) {
        if (t.balances) t.balances = { post: t.balances.post && 1000, pre: t.balances.pre && 1000 };
    }
    const r = replay(txs, { viewed });
    check(S3, 'rent bound below coverage -> declined, not complete', 'best-effort', r.status, r.reason);
    check(S3, '  declined bound is reported', true, r.length.declinedRentBound != null);
}
{
    // setData + close in ONE transaction: that tx's postBalance for the buffer is 0, so the PRE balance is the
    // observation that has to be used.
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 16, payload });
    const viewedTx = txs[txs.length - 1];
    check(S3, 'viewed tx postBalance for the buffer is 0', 0, viewedTx.balances.post);
    const r = replay(txs, { viewed });
    check(S3, 'viewed tx preBalance still pins the length', true, r.length.pinned, JSON.stringify(r.anchor));
}
{
    // The PDA-buffer / in-place-metadata flow, which design.md §4.2 calls the case with NO anchor at or below
    // REALLOC_LIMIT (no pre-sized createAccount, no extend). The canonical client
    // (getPdaBufferInstructionPlan / getCreateMetadataInstructionPlanUsingNewBuffer) pre-funds the account with a
    // System transfer of getMinimumBalance(getAccountSize(dataLength)) - the FULL final size - before allocate.
    // So the rent bound pins the length exactly and this case is NOT unanchored.
    const payloadPda = bytes(0x33, 12);
    const fullRent = rentFor(HEADER_LEN + payloadPda.length);
    const viewedSig = nextSig();
    const txs = [
        tx({ balance: { post: fullRent, pre: 0 }, ixs: [allocate()], slot: 1 }), // transfer + allocate in one tx
        tx({ balance: { post: fullRent, pre: fullRent }, ixs: [write(0, payloadPda.slice(0, 6))], slot: 2 }),
        tx({ balance: { post: fullRent, pre: fullRent }, ixs: [write(6, payloadPda.slice(6))], slot: 3 }),
        tx({ balance: { post: fullRent, pre: fullRent }, ixs: [setData()], sig: viewedSig, slot: 4 }),
    ];
    const r = replay(txs, { viewed: { ixIndex: 0, sig: viewedSig, slot: 4 } });
    check(
        S3,
        'PDA buffer pre-funded for the full size -> rent bound pins it, complete',
        'complete',
        r.status,
        r.reason,
    );
    check(S3, '  (design.md calls this case unanchored)', 12, r.dataLength);
}
{
    // No anchor at all: created at header size, grown purely by write, always over-funded.
    const viewedSig = nextSig();
    const over = rentFor(HEADER_LEN + 64);
    const txs = [
        tx({ balance: { post: over, pre: 0 }, ixs: [createAccount(HEADER_LEN), allocate()], slot: 1 }),
        tx({ balance: { post: over, pre: over }, ixs: [write(0, bytes(0x22, 8))], slot: 2 }),
        tx({ balance: { post: 0, pre: over }, ixs: [setData(), close()], sig: viewedSig, slot: 3 }),
    ];
    const r = replay(txs, { viewed: { ixIndex: 0, sig: viewedSig, slot: 3 } });
    check(S3, 'no anchor -> best-effort even when writes look contiguous', 'best-effort', r.status, r.reason);
}

// ---------------------------------------------------------------------------------------------------------------
// 4. holes: design.md as written reports complete for content that is not

const S4 = '4. holes in design.md';
{
    // Pre-sized genesis for an 8-byte payload, then the buffer is REWRITTEN with a 16-byte payload (updateBuffer
    // emits neither allocate nor close, and `write` auto-grows the account). The rewrite's tail write is pruned.
    // design.md calls createAccount.space "EXACT, any size", so it derives data_length = 8, which the surviving
    // writes cover exactly -> "complete", for a payload that is really 16 bytes.
    const viewedSig = nextSig();
    const smallSpace = HEADER_LEN + 8;
    const grownSpace = HEADER_LEN + 16;
    const txs = [
        tx({ balance: { post: rentFor(smallSpace), pre: 0 }, ixs: [createAccount(smallSpace), allocate()], slot: 1 }),
        tx({
            balance: { post: rentFor(smallSpace), pre: rentFor(smallSpace) },
            ixs: [write(0, bytes(0xaa, 8))],
            slot: 2,
        }),
        // rewrite with a bigger payload, account is topped up and auto-grown by write
        tx({
            balance: { post: rentFor(grownSpace), pre: rentFor(smallSpace) },
            ixs: [write(0, bytes(0xcc, 8))],
            slot: 9,
        }),
        // the write covering [8, 16) was pruned from RPC history
        tx({ balance: { post: 0, pre: rentFor(grownSpace) }, ixs: [setData(), close()], sig: viewedSig, slot: 10 }),
    ];
    const viewed = { ixIndex: 0, sig: viewedSig, slot: 10 };
    // Isolate the ANCHOR axis: correct replay both times, only the length derivation differs.
    const asDesigned = replay(txs, { anchorMode: 'as-designed', viewed });
    const corrected = replay(txs, { viewed });
    check(S4, 'hole: rewrite grew past createAccount.space -> as-designed anchor says', 'complete', asDesigned.status);
    check(S4, 'hole: rewrite grew past createAccount.space -> as-designed anchor length', 8, asDesigned.dataLength);
    check(
        S4,
        'hole: rewrite grew past createAccount.space -> corrected says',
        'best-effort',
        corrected.status,
        corrected.reason,
    );
}
{
    // The Triton fast path returns transactions ASCENDING, so the design's snippet reaches the viewed transaction
    // last and processes it WHOLE. setData and the buffer's close share that transaction, so the close wipes the
    // session that was just assembled.
    const { txs, viewed } = preSizedBufferScenario({ chunkSize: 4, payload });
    const asDesigned = replay(txs, { mode: 'as-designed', viewed });
    const corrected = replay(txs, { viewed });
    check(S4, 'hole: close inside the viewed tx (ascending) -> as-designed recovers bytes', 0, asDesigned.bytes.length);
    check(
        S4,
        'hole: close inside the viewed tx (ascending) -> corrected recovers bytes',
        payload.length,
        corrected.bytes.length,
    );
}
{
    // The fallback path receives signatures NEWEST FIRST. The design's snippet iterates them in that order without
    // sorting, so the `close` that ended the PREVIOUS lifecycle is reached AFTER the current session's writes and
    // wipes them, leaving the previous payload attributed to the viewed transaction.
    const space = HEADER_LEN + 8;
    const viewedSig = nextSig();
    const chronological = [
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: 1 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0x11, 8))], slot: 2 }),
        tx({ balance: { post: 0, pre: rentFor(space) }, ixs: [close()], slot: 3 }),
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: 4 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0x22, 8))], slot: 5 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [setData()], sig: viewedSig, slot: 6 }),
    ];
    const newestFirst = [...chronological].reverse();
    const viewed = { ixIndex: 0, sig: viewedSig, slot: 6 };
    const asDesigned = replay(newestFirst, { mode: 'as-designed', viewed });
    const corrected = replay(newestFirst, { viewed });
    check(
        S4,
        'hole: reused buffer, newest-first -> as-designed returns the PREVIOUS payload',
        `${bytes(0x11, 8)}`,
        `${asDesigned.bytes}`,
    );
    check(
        S4,
        'hole: reused buffer, newest-first -> corrected returns the current payload',
        `${bytes(0x22, 8)}`,
        `${corrected.bytes}`,
    );
}
{
    // `slot <= viewedSlot` includes a same-slot transaction that executed AFTER the viewed setData.
    const space = HEADER_LEN + 8;
    const viewedSig = nextSig();
    const txs = [
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: 1 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0xaa, 8))], slot: 2 }),
        tx({ balance: { post: 0, pre: rentFor(space) }, ixs: [setData()], sig: viewedSig, slot: 3 }),
        // same slot, executed after the viewed setData, no transactionIndex to prove it
        tx({
            balance: { post: rentFor(space), pre: rentFor(space) },
            ixs: [write(0, bytes(0xdd, 8))],
            sig: 'later',
            slot: 3,
        }),
    ];
    const viewed = { ixIndex: 0, sig: viewedSig, slot: 3 };
    const asDesigned = replay(txs, { mode: 'as-designed', viewed });
    const corrected = replay(txs, { viewed });
    check(S4, 'hole: same-slot later write -> as-designed folds it in', `${bytes(0xdd, 8)}`, `${asDesigned.bytes}`);
    check(S4, 'hole: same-slot later write -> corrected excludes it', `${bytes(0xaa, 8)}`, `${corrected.bytes}`);
    check(
        S4,
        'hole: same-slot later write -> corrected notes the ambiguity',
        1,
        corrected.notes.length,
        corrected.notes[0],
    );
}
{
    // A rent-exempt account may GROW and CLOSE inside one transaction with no top-up, because a zero post-balance
    // is an allowed rent state. So the only balance observation left can predate the growth, and the rent "upper
    // bound" then sits BELOW the true size. design.md compares the bound against write coverage alone, so an
    // `extend` (which grows the account and adds no write coverage) makes it report PROVABLY COMPLETE for a
    // payload that is 500 bytes longer than what was recovered.
    const space = HEADER_LEN + 1000;
    const viewedSig = nextSig();
    const txs = [
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: 1 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0xee, 1000))], slot: 2 }),
        // extend needs no funding: the account closes in the same transaction, so its post balance is 0
        tx({
            balance: { post: 0, pre: rentFor(space) },
            ixs: [extend(500), setData(), close()],
            sig: viewedSig,
            slot: 3,
        }),
    ];
    const viewed = { ixIndex: 1, sig: viewedSig, slot: 3 };
    const asDesigned = replay(txs, { anchorMode: 'as-designed', viewed });
    const corrected = replay(txs, { viewed });
    check(S4, 'hole: same-tx extend + close -> as-designed anchor says', 'complete', asDesigned.status);
    check(S4, 'hole: same-tx extend + close -> as-designed anchor length', 1000, asDesigned.dataLength);
    // The corrected model lands on the stronger `incomplete`: the extend raised the size to 1596, so [1000, 1500)
    // is a real coverage gap. extend zero-fills, but a replay cannot tell a zero-filled range from a pruned write.
    check(
        S4,
        'hole: same-tx extend + close -> corrected declines the rent bound',
        'incomplete',
        corrected.status,
        corrected.reason,
    );
    check(
        S4,
        'hole: same-tx extend + close -> corrected replayed size is 1596',
        HEADER_LEN + 1500,
        corrected.replayedSize,
    );
}
{
    // A write issued via CPI lives in meta.innerInstructions. A replay that walks only outer instructions misses it
    // and reports a gap that is not really there (or, worse for the current-state test, misses a later setData).
    const space = HEADER_LEN + 8;
    const viewedSig = nextSig();
    const txs = [
        tx({ balance: { post: rentFor(space), pre: 0 }, ixs: [createAccount(space), allocate()], slot: 1 }),
        tx({ balance: { post: rentFor(space), pre: rentFor(space) }, ixs: [write(0, bytes(0xaa, 4))], slot: 2 }),
        tx({
            balance: { post: rentFor(space), pre: rentFor(space) },
            ixs: [
                { disc: 'cpi', program: 'SomeOtherProgram' },
                { ...write(4, bytes(0xaa, 4)), inner: true },
            ],
            slot: 3,
        }),
        tx({ balance: { post: 0, pre: rentFor(space) }, ixs: [setData(), close()], sig: viewedSig, slot: 4 }),
    ];
    const viewed = { ixIndex: 0, sig: viewedSig, slot: 4 };
    check(
        S4,
        'hole: CPI write -> as-designed reports',
        'incomplete',
        replay(txs, { mode: 'as-designed', viewed }).status,
    );
    check(S4, 'hole: CPI write -> corrected reports', 'complete', replay(txs, { viewed }).status);
}
{
    // design.md labels the extend chain EXACT, but exactness needs the WHOLE chain, which is unverifiable. Retention
    // dropped BOTH the second extend and the writes it reserved space for, so every surviving observation is
    // internally consistent: anchor 10240, coverage [0, 10240), no gap. The as-designed anchor therefore reports
    // `complete` for a payload that is really 12288 bytes. The usual retention direction (extends are older than the
    // writes they reserve, so they are dropped first) gives anchor < coverage and is caught, which is what makes this
    // ordering the dangerous one.
    const trueSize = HEADER_LEN + 12288;
    const viewedSig = nextSig();
    const txs = [
        tx({ balance: { post: rentFor(HEADER_LEN), pre: 0 }, ixs: [createAccount(HEADER_LEN), allocate()], slot: 1 }),
        tx({ balance: { post: rentFor(trueSize), pre: rentFor(HEADER_LEN) }, ixs: [extend(10240)], slot: 2 }),
        // extend(2048) at slot 3 was pruned, and so were the writes covering [10240, 12288)
        tx({
            balance: { post: rentFor(trueSize), pre: rentFor(trueSize) },
            ixs: [write(0, bytes(0x41, 10240))],
            slot: 4,
        }),
        tx({ balance: { post: 0, pre: rentFor(trueSize) }, ixs: [setData(), close()], sig: viewedSig, slot: 9 }),
    ];
    const viewed = { ixIndex: 0, sig: viewedSig, slot: 9 };
    const asDesigned = replay(txs, { anchorMode: 'as-designed', viewed });
    const corrected = replay(txs, { viewed });
    check(S4, 'hole: extend chain pruned mid AND tail -> as-designed says', 'complete', asDesigned.status);
    check(
        S4,
        'hole: extend chain pruned mid AND tail -> as-designed length is short by 2048',
        10240,
        asDesigned.dataLength,
    );
    check(
        S4,
        'hole: extend chain pruned mid AND tail -> corrected refuses complete',
        'best-effort',
        corrected.status,
        corrected.reason,
    );
    check(S4, '  the rent bound is what saves it (upper 12384 > lower 10336)', trueSize, corrected.length.upperSize);
}
{
    // A buffer address can be reused inside ONE slot: lifecycle 1 ends with setData + close at transactionIndex 2 and
    // lifecycle 2 creates and writes at transactionIndex 9. design.md's `slot <= viewedSlot` admits lifecycle 2, so
    // its payload is attributed to the viewed setData. Distinct from the same-slot-later-write fixture above, because
    // this one also crosses a close and a re-create, so it exercises the session reset ordering too.
    const space1 = HEADER_LEN + 16;
    const space2 = HEADER_LEN + 32;
    const viewedSig = nextSig();
    const chronological = txIndexed => [
        tx({ balance: { post: rentFor(space1), pre: 0 }, ixs: [createAccount(space1), allocate()], slot: 28 }),
        tx({ balance: { post: rentFor(space1), pre: rentFor(space1) }, ixs: [write(0, bytes(0x41, 16))], slot: 29 }),
        tx({
            balance: { post: 0, pre: rentFor(space1) },
            ixs: [setData(), close()],
            sig: viewedSig,
            slot: 30,
            txIndex: txIndexed ? 2 : undefined,
        }),
        tx({
            balance: { post: rentFor(space2), pre: 0 },
            ixs: [createAccount(space2), allocate(), write(0, bytes(0x5a, 32))],
            sig: 'lifecycle2',
            slot: 30,
            txIndex: txIndexed ? 9 : undefined,
        }),
    ];
    const viewedFallback = { ixIndex: 0, sig: viewedSig, slot: 30 };
    const viewedFast = { ...viewedFallback, txIndex: 2 };
    const asDesigned = replay(chronological(false), { mode: 'as-designed', viewed: viewedFallback });
    const fast = replay(chronological(true), { viewed: viewedFast });
    const fallback = replay(chronological(false), { viewed: viewedFallback });
    check(
        S4,
        'hole: intra-slot buffer reuse -> as-designed returns the NEXT lifecycle payload',
        `${bytes(0x5a, 32)}`,
        `${asDesigned.bytes}`,
    );
    check(
        S4,
        'hole: intra-slot buffer reuse -> corrected fast path uses transactionIndex',
        `${bytes(0x41, 16)}`,
        `${fast.bytes}`,
    );
    check(
        S4,
        'hole: intra-slot buffer reuse -> corrected fallback excludes and flags',
        `${bytes(0x41, 16)}`,
        `${fallback.bytes}`,
    );
    check(S4, '  the fallback records the unorderable transaction', 1, fallback.notes.length, fallback.notes[0]);
}

// ---------------------------------------------------------------------------------------------------------------
// 5. bounded inflate (design.md §3)

const S5 = '5. bounded inflate';
{
    const source = new TextEncoder().encode('{"name":"hello"}');
    for (const [label, compressed] of [
        ['zlib', pako.deflate(source)],
        ['gzip', pako.gzip(source)],
    ]) {
        try {
            const out = boundedUncompressAsDesigned(compressed, 2, 1024);
            check(S5, `as-designed inflates ${label}`, `${source}`, `${out}`);
        } catch (e) {
            check(S5, `as-designed inflates ${label}`, `${source}`, `THREW ${e.message}`);
        }
        try {
            const out = boundedUncompress(compressed, 2, 1024);
            check(S5, `corrected inflates ${label}`, `${source}`, `${out}`);
        } catch (e) {
            check(S5, `corrected inflates ${label}`, `${source}`, `THREW ${e.message}`);
        }
    }

    const bomb = pako.gzip(new Uint8Array(200 * 1024 * 1024));
    for (const [label, fn] of [
        ['as-designed', boundedUncompressAsDesigned],
        ['corrected', boundedUncompress],
    ]) {
        const started = process.hrtime.bigint();
        let outcome;
        try {
            const out = fn(bomb, 1, 1024 * 1024);
            outcome = `returned ${out.length} bytes`;
        } catch (e) {
            outcome = e instanceof PayloadTooLargeError ? 'PayloadTooLargeError' : `other: ${e.message}`;
        }
        const ms = Number(process.hrtime.bigint() - started) / 1e6;
        check(S5, `${label} aborts a 200MB bomb at a 1MB cap`, 'PayloadTooLargeError', outcome, `${ms.toFixed(0)}ms`);
    }
    check(S5, 'bomb compressed size (bytes)', true, bomb.length < 250_000, `${bomb.length}`);

    // A TRUNCATED compressed stream is what an incomplete reconstruction hands to the inflater, so it is the
    // likely input here. pako's `push` returns without calling `onEnd` when it runs out of input, leaving
    // `err = 0` and `result = undefined`, so the design's snippet returns `undefined` typed as Uint8Array. The
    // library's own decodeData then throws "Cannot read properties of undefined".
    const truncated = pako.gzip(new Uint8Array(1024 * 1024)).subarray(0, 200);
    for (const [label, fn] of [
        ['as-designed', boundedUncompressAsDesigned],
        ['corrected', boundedUncompress],
    ]) {
        let outcome;
        try {
            const out = fn(truncated, 1, 4 * 1024 * 1024);
            outcome = out === undefined ? 'returned undefined' : `returned ${out.length} bytes`;
        } catch (e) {
            outcome = e.constructor.name;
        }
        const expected = label === 'corrected' ? 'TruncatedStreamError' : 'returned undefined';
        check(S5, `${label} on a truncated stream`, expected, outcome);
    }
}

// ---------------------------------------------------------------------------------------------------------------

let failures = 0;
let currentSection = '';
for (const r of results) {
    if (r.section !== currentSection) {
        currentSection = r.section;
        console.log(`\n${currentSection}`);
    }
    if (!r.ok) failures++;
    const mark = r.ok ? 'PASS' : 'FAIL';
    console.log(`  ${mark}  ${r.name}`);
    if (!r.ok) console.log(`        expected ${JSON.stringify(r.expected)} got ${JSON.stringify(r.actual)}`);
    if (r.detail) console.log(`        note: ${r.detail}`);
}
console.log(`\n${results.length - failures}/${results.length} checks passed`);
process.exit(failures === 0 ? 0 : 1);
