# Design: Decode PMP buffer content on the instruction page

Technical shape and risks behind `proposal.md`. Not a task breakdown - detailed planning (and the `specs/` delta
+ `tasks.md`) come later. Facts here were ground-truthed against the installed packages
(`@solana-program/program-metadata@0.7.0`, `@solana/web3.js@1.98.4`, `@solana/kit@6.5.0`) and the PMP program
source (`github.com/solana-program/program-metadata`, `main`).

## 1. Which PMP instructions carry decodable content

Discriminators and account order below were verified against the generated client (the `ProgramMetadataInstruction`
enum and the `getXInstruction` builders).

| Ix | Disc | Accounts | Args | Carries content? |
|----|------|-----------------|-------------|------------------|
| `setData` | 3 | `metadata, authority, buffer, program, programData` | `encoding, compression, format, dataSource, data` | YES - inline `data` OR from `buffer` account (index 2) |
| `initialize` | 1 | `metadata, authority, program, programData, system` | `seed, encoding, compression, format, dataSource, data` | YES - inline `data` OR from the metadata account itself (pre-allocated buffer, in-place) |
| `write` | 0 | `buffer, authority, sourceBuffer` | `offset, data` | Fragment only - a raw chunk, NO encoding/compression/format hints |
| `allocate` `setAuthority` `setImmutable` `trim` `extend` `close` | 7,2,4,5,8,6 | - | - | No payload |

Key facts:
- `setData` copies from an optional source `buffer` at account index 2. When omitted, that slot holds the program
  id - the program gates the external-buffer path on `buffer.address() != programId`.
- `setData` and `initialize` are the only instructions carrying the decode hints (`encoding`, `compression`,
  `format`, `dataSource`). The hints are historically exact because they are part of the transaction.
- `setData`'s `dataSource` byte is itself OPTIONAL on the wire - the program splits it off the remaining ix data
  (`processor/set_data.rs`), so exactly three shapes are valid and everything else is `InvalidInstructionData`:
  - 4 bytes (`disc, encoding, compression, format`) - header-only hint update, `buffer` MUST be the program id.
  - 5 bytes (`+ dataSource`) - bytes come from the foreign `buffer`, which MUST NOT be the program id.
  - 5+N bytes (`+ dataSource + data`) - inline payload, `buffer` MUST be the program id.
  The generated `getSetDataInstructionDataDecoder()` encodes `dataSource` unconditionally, so it THROWS on the
  4-byte shape. Branch on the ix data length before decoding - see 3 and 4.1. `initialize` has no such variance
  (`dataSource` is a fixed struct field, and its wire form is 21 bytes - `Initialize::LEN == 20` is the Rust struct
  WITHOUT the discriminator), so its decoder always applies.
- Housekeeping ixs are payload-neutral BY ACCOUNT TYPE, not universally. On a METADATA account `trim`,
  `extend`, `setAuthority`, `setImmutable` and `allocate` never change the decoded payload: `trim` reallocs to
  `Header::LEN + data_length` and refunds rent without touching `data_length`, the hints, or the bytes, and `extend`
  grows the account without touching `data_length`. On a BUFFER account `trim` is a size no-op (`processor/trim.rs`
  takes `length = account.data_len()` for the Buffer discriminator, so it only refunds rent, and a buffer NEVER
  shrinks), but `extend` is NOT payload-neutral: a buffer has no `data_length` and `setData` copies its WHOLE body,
  so every `extend` moves the buffer's payload extent. So `setData + trim` and `setData + close` decode entirely
  from `setData`, while a buffer's `extend` chain is part of that buffer's payload sizing (see 4.2).
- A `Buffer` has NO `data_length` field (`state/buffer.rs` is header + trailing bytes), so a buffer's payload
  extent is exactly `account_size - 96`, and `setData` from a buffer copies the WHOLE body (`buffer_data[96..]`)
  and writes its length into the metadata header. `write` auto-grows the account and never shrinks it. Mind which
  offset the formula uses: the wire field `write.offset` is LOGICAL (0-based inside the payload) and
  `processor/write.rs` adds the header itself, so the resulting PHYSICAL account size is
  `max(account.data_len(), 96 + write.offset + chunk.len())`. 4.2 states the same growth in logical terms
  (`96 + max(write.offset + chunk.length)` as an account-size bound), so the two never disagree by a header.
- Header length is fixed at 96 bytes (`Header::LEN == Buffer::LEN == 96`, both verified against `state/header.rs`
  and `state/buffer.rs`). This matters only when slicing RAW account bytes (skip the 96-byte header). It does NOT
  apply to `write`-ix replay - see 4.2.

## 2. Decoding toolkit (already installed)

`@solana-program/program-metadata@0.7.0` provides everything needed:
- Enums `Encoding` (None=0 -> hex, Utf8=1, Base58=2, Base64=3), `Compression` (None=0, Gzip=1, Zlib=2),
  `Format` (None=0, Json=1, Yaml=2, Toml=3), `DataSource` (Direct=0, Url=1, External=2). Numeric values verified.
- `unpackDirectData({data, encoding, compression}) -> string` - SYNC, no RPC (`uncompress -> decode`). Does NOT
  consume `format` - JSON/YAML/TOML rendering is the explorer's job (the enum only classifies content).
- `unpackAndFetchData({rpc, dataSource, data, encoding, compression}) -> Promise<string>` - NOT USED. Only its
  `Direct` branch is usable, and that branch just calls `unpackDirectData`. Its `Url` branch does a bare
  `fetch(url)` with no scheme check, no size cap, no timeout, and no `response.ok` check. Its `External` branch
  does an unbounded `fetchEncodedAccount` (no `dataSlice`), then `assertAccountExists` (THROWS on a missing
  account, which P3 requires to degrade gracefully), then an unbounded `uncompressData`. All three conflict with
  the P3 length bound, the P4 fetch guards, and the decompression bound in 6. Hand-roll the fetch instead (see 3,
  5, and the single-RPC-stack decision in 7). The same applies to `unpackAndFetchUrlData`,
  `unpackAndFetchExternalData`, and `unpackFetchedExternalData`.
- Reusable pieces that ARE safe (pure, no fetch, no inflate): `unpackExternalData(bytes) -> {address, offset?,
  length?}` (or `getExternalDataDecoder()` directly) for the `ExternalData` pointer, and `decodeData(bytes,
  encoding)` for the encoding step after a self-owned bounded decompress. `uncompressData` is exported too but is
  unbounded - use it only for tx-bounded inline bytes.
- Typed decoders `getSetDataInstructionDataDecoder()`, `getInitializeInstructionDataDecoder()`,
  `getWriteInstructionDataDecoder()` - decode raw ix bytes to numeric enums + a typed `Option<bytes>`. The
  `setData` decoder requires the optional `dataSource` byte and throws on a 4-byte header-only ix (see 1 and 3).
- `pako@2.1.0` (zlib/gzip) runs under the hood of `uncompressData`. WARNING: its inflate is UNBOUNDED. Safe as-is
  ONLY for INLINE bytes (tx-bounded to ~1 KB -> <=~1 MB inflated: P1 Direct-inline and the P4 URL pointer). For
  BUFFER-sourced (P2) or FETCHED External (P3) bytes the compressed input is not tx-bounded, so decompression MUST
  run through a self-owned bounded inflate (see 6). `decodeData` and `uncompressData` are exported, so the encoding
  step can be reused after the bounded decompress.

`bytes.ts` has no base58 helper - base58 decode comes from the library (`decodeData`) / kit, not from
`app/shared/lib/bytes.ts`.

## 3. Reading the decode config

Decode the config from the RAW ix bytes with the typed decoders, NOT from the Codama-parsed args. At
`CodamaInstructionCard` both inputs are in hand: `ix.data` (a web3.js `Buffer`, i.e. a `Uint8Array` subclass) and
account metas via `parsedIx.accounts`. The parser's scalar enum args are NOT the problem - it emits them as plain
NUMBERS (`encoding: 3`, identical to the library's own `Encoding.Base64 === 3`), so there is no string->enum mapping
to get wrong. What the parser cannot give is the PAYLOAD BYTES: it returns `data` as an `Option` wrapping a
RE-ENCODED `['base64', string]` TUPLE rather than bytes, so the raw bytes have to be re-obtained anyway. And the
4-byte header-only `setData` is a shape Codama cannot parse at all. Those two facts, not the enums, are why the
raw-bytes path is required. Import the enums from the library, do not hardcode numeric values (version coupling to
0.7.0).

Guard the `setData` decode on the ix data length FIRST: a 4-byte `setData` is the header-only shape and
`getSetDataInstructionDataDecoder()` throws on it (see 1). `dataSource` is therefore absent for that shape, so the
config type must model it as optional rather than assuming a `DataSource` is always present.

### High level implementation shape

Read the config + payload by decoding the RAW instruction bytes with the typed decoder (numeric enums + typed
`Option<bytes>`) rather than reading the parser's re-encoded `['base64', string]` payload tuple. At the card both
are in hand: `ix.data` (raw bytes) and `parsedIx.accounts`, which are account METAS shaped
`{ address, role, name }` - so every address test reads `accounts[2].address !== PMP`, never `accounts[2] !== PMP`.

```ts
import {
  Encoding, Compression, Format, DataSource,
  getSetDataInstructionDataDecoder, getInitializeInstructionDataDecoder,
  unpackDirectData, // SYNC inline decode (uncompress -> decode). Safe as-is for tx-bounded inline bytes. No `format`.
  decodeData,       // exported encoding step (hex/utf8/base58/base64); reused after a self-owned bounded decompress.
} from '@solana-program/program-metadata';
import { unwrapOption } from '@solana/kit';
import pako from 'pako';
import { concat } from '@/app/shared/lib/bytes';

type DecodeConfig = {
  encoding: Encoding; // None(hex) | Utf8 | Base58 | Base64
  compression: Compression; // None | Gzip | Zlib
  format: Format; // None | Json | Yaml | Toml
  dataSource?: DataSource; // Direct | Url | External. ABSENT on a 4-byte header-only setData - see 1 and 4.1.
};

// setData only. 4 bytes = header-only shape, which the generated decoder cannot decode (no dataSource byte).
// Returns the hints so the card can still show what the ix changed, with no payload to decode.
function decodeSetDataConfig(ixData: Uint8Array): DecodeConfig {
  if (ixData.length === 4) {
    const [, encoding, compression, format] = ixData;
    return { encoding, compression, format }; // dataSource undefined -> "nothing new in this ix"
  }
  const { encoding, compression, format, dataSource } = getSetDataInstructionDataDecoder().decode(ixData);
  return { encoding, compression, format, dataSource };
}

type DecodedContent = { text: string; format: Format; truncated: boolean };

class PayloadTooLargeError extends Error {}

// Provenance decides the guard (see 6). INLINE bytes are tx-bounded (~1 KB -> <=~1 MB), so the library's
// unpackDirectData is safe as-is. Used by P1 Direct-inline and the P4 URL-pointer decode. SYNC, no RPC.
function decodeInline(rawData: Uint8Array, config: DecodeConfig): DecodedContent {
  const text = unpackDirectData({ data: rawData, encoding: config.encoding, compression: config.compression });
  return { text, format: config.format, truncated: false }; // caller still enforces the render-size cap
}

// BUFFER-sourced (P2) or FETCHED External (P3) bytes are NOT tx-bounded, so own the decompress with a bounded
// pako.Inflate, then reuse the exported decodeData for the encoding step. `cap` == the inflate output cap (1 MB).
function boundedUncompress(data: Uint8Array, compression: Compression, cap: number): Uint8Array {
  if (compression === Compression.None) return data;
  // 47 = 15 window bits + 32 auto-detect, so one path handles both zlib and gzip. chunkSize bounds the overshoot
  // past `cap` (pako defaults to 64 KB, NOT the 16 KB its own docstring claims), so set it explicitly.
  // @types/pako declares NEITHER `chunks` NOR `options`, so accumulate into our OWN array, never inflator.chunks.
  const inflator = new pako.Inflate({ windowBits: 47, chunkSize: 16 * 1024 });
  const out: Uint8Array[] = [];
  let total = 0;
  inflator.onData = (chunk: Uint8Array) => {
    total += chunk.length;
    // pako calls onData per output chunk and does NOT catch, so the throw aborts the inflate loop
    if (total > cap) throw new PayloadTooLargeError();
    out.push(chunk);
  };
  // May throw PayloadTooLargeError. The catch path MUST NOT read inflator.result: once the cap throw aborted the
  // run it is undefined (only `out` holds anything).
  inflator.push(data, true);
  // Check `ended`, NOT `err`: push() returns without calling onEnd on a TRUNCATED stream, leaving err 0,
  // ended false and result undefined - exactly the shape an incomplete reconstruction produces.
  if (!inflator.ended) throw new Error(inflator.msg || 'truncated compressed stream');
  return concat(out); // our own accumulation (app/shared/lib/bytes.ts), so onEnd's gluing is not relied on
}

function decodeBounded(rawData: Uint8Array, config: DecodeConfig, cap: number): DecodedContent {
  const raw = boundedUncompress(rawData, config.compression, cap);
  return { text: decodeData(raw, config.encoding), format: config.format, truncated: false };
}

// P3 External: decode the 40-byte pointer with unpackExternalData, fetch the referenced account with a
// `dataSlice` so the RPC bounds the transfer server-side (see 5/6), then decode via the bounded path above.
// Do NOT delegate to unpackAndFetchData - its inflate is unbounded, its fetch is unsliced, and it throws on a
// missing account (see 2, 6, and 7's single-RPC-stack decision). P4 Url differs: compression applies to the
// POINTER (decodeInline), `format` to the fetched body, which is guarded by the fetch size/timeout cap, not pako.
function decodeFetchedExternal(fetchedSlice: Uint8Array, config: DecodeConfig, cap: number): DecodedContent {
  return decodeBounded(fetchedSlice, config, cap);
}

// JSON/YAML/TOML/None
function prettify(text: string, format: Format) {
  // Format=Json -> JSON.parse + stringify(2) with a size cap before parse; else show verbatim in <pre>.
}
```

## 4. Getting the bytes

### 4.1 setData / initialize branch table

Branch on the ix data LENGTH first (the `dataSource` byte is optional, see 1), then on inline `data`.

| Ix | Condition | Bytes source | Cost |
|----|-----------|--------------|------|
| `setData` | ix data is 4 bytes (no `dataSource` byte) | none - header-only hint update (bytes unchanged) | nothing new |
| `setData` | `data` non-empty (so `buffer` idx 2 == PMP id) | inline (this ix) | 0 RPC |
| `setData` | `data` empty AND `buffer` (idx 2) != PMP id | foreign buffer account | reconstruct |
| `initialize` | `data` non-empty | inline (this ix) | 0 RPC |
| `initialize` | `data` empty (in-place) | the metadata account itself | reconstruct |

The 4-byte row is a header-only update (e.g. changing `format` without touching bytes) - the payload bytes still
exist in the account from prior writes, so "nothing new in THIS ix" is the honest UI, not "no data". Do NOT key
this row off the buffer address: a 5-byte `setData` (`dataSource` present, `data` empty) with `buffer == PMP id`
is `InvalidInstructionData` on-chain, so it can never appear in a successful transaction. The remaining
combinations are mutually exclusive by construction, which is why the length check has to come first.

`initialize` has no foreign buffer. Its in-place path triggers when the metadata account already carries the
Buffer discriminator AND the ix has empty remaining data - `initialize` finalizes the pre-written bytes
(`allocate` + `write` on the metadata PDA) in place. From the instruction alone the explorer sees an empty `data`
arg and must reconstruct from the preceding `write` ixs (or read the account).

### 4.2 Reconstruction (feasibility + ceiling)

Reconstruction IS feasible. Two distinct techniques, and the difference matters:

- **Live account read** - one `getAccountInfo`, slice off the 96-byte header, read `[96, 96+data_length)`. Cheap,
  but gives the account's CURRENT state - correct for the viewed tx only if nothing changed it since, and returns
  `null` for a foreign buffer (the client closes it right after `setData` to reclaim rent).
- **Write-replay (the point-in-time method, and the only one for a closed buffer)**:
  - `getSignaturesForAddress(account)` -> txs that touched it
  - bound to the viewed transaction's EXECUTION POSITION (`slot`, `transactionIndex`, intra-tx ix index), not to
    its slot, and to the current session (writes after the last `allocate`/`close`, which is a necessary but not
    sufficient boundary - see the assembly-order rule below). On the fallback path `transactionIndex` is
    unavailable, so a same-slot transaction that cannot be ordered against the viewed one is EXCLUDED and the
    result is flagged, never folded in.
  - `getTransaction(sig)` per tx -> raw ix bytes at `message.compiledInstructions[].data`
  - decode each `write` `(offset, chunk)` and PATCH the chunk into a fixed-size `data_length` buffer at `offset`
    (logical offset, NO +96 - the +96 is a physical-account detail only)
  - decode the assembled bytes with the `setData`/`initialize` hints

**Assembly order - the rule, and the property that usually hides it.** On-chain `write` is LAST-WRITER-WINS
(`processor/write.rs` does a `copy_nonoverlapping` into the account at `offset + 96`), so the authoritative
assembly order is execution order: `(slot, transactionIndex, intra-tx ix index)`. Offset-patching being
order-independent is a PROPERTY of disjoint ranges, not the rule. When ranges are disjoint the fetch order cannot
matter, which is what sidesteps `getSignaturesForAddress` having no intra-slot index. When two writes in the same
session cover intersecting ranges with DIFFERENT bytes, order decides the result and the fallback cannot resolve
it. Consequences:
  - Classify while patching. Track the written ranges. A conflicting overlap is an intersection whose bytes differ.
    An intersection with identical bytes is an idempotent retry, not a conflict, and needs no ordering.
  - A conflicting overlap is resolvable when the participants are totally ordered by the keys at hand (different
    slots, or the same tx via ix index, or `transactionIndex` on the Triton fast path). Otherwise (same slot,
    different txs, no `transactionIndex`) the status is `ambiguous`, which is a status value in its own right and
    never a flag layered onto another one - so it is never rendered as `complete`. This is also why the fast path
    and the fallback are only guaranteed to agree byte for byte in the absence of a conflicting overlap - see the
    path-independence requirement in the p2 spec.
  - `allocate`/`close` are order-SENSITIVE session boundaries, so a same-slot `close`-before-`write` or
    `write`-before-`allocate` needs `transactionIndex` or intra-tx order to place correctly.
  - `allocate`/`close` are NOT a complete session boundary. `getUpdateBufferInstructionPlan` and
    `getUpdateMetadataInstructionPlanUsingExistingBuffer` rewrite a LIVE buffer with no `allocate` and no `close`
    in between, so the canonical client itself produces two overlapping write sets inside one "session". Since
    `trim` on a buffer is a size no-op (see 1), a shorter rewrite also leaves a stale tail that `setData` then
    copies into the payload. Treat a buffer rewrite as the realistic conflicting-overlap case, not a hypothetical.

**Writes that carry no recoverable bytes.** A `write` with empty inline `data` and a `sourceBuffer` (idx 2) copies
the WHOLE source buffer body (`processor/write.rs`), emitted by `createBuffer`/`updateBuffer` when a `sourceBuffer`
is passed. Those bytes are not in the transaction, so THIS replay pass cannot recover them. Detect the ix shape
explicitly, mark the range it covers as unrecoverable, and do NOT patch an undefined chunk. The interval it makes
unrecoverable is `[offset, dataLength)` when a length is derived, and an unbounded tail from `offset` when none is -
never a zero-length range, because the copied body's size is exactly what the transaction does not carry.

The range is not unrecoverable in principle, though. `@solana/idl` recurses into the SOURCE buffer's own `write`
history for exactly this shape, which recovers the bytes whenever that history is still retained and the source is
itself replayable. That recursion is DEPTH-1 and lives in `applyInstruction`, not inside the buffer replay, so it is
not a general fixpoint either. P2 keeps the conservative behaviour (mark unrecoverable, result `incomplete`) and
leaves a bounded recursion, with a depth and cycle guard, as a later enhancement rather than claiming the bytes are
gone.

**Sizing the payload - the length comes from BOUNDS (load-bearing).** The assembled length MUST NOT be
`max(write.offset + chunk.length)`. Both prior implementations take exactly that shortcut and neither bounds it from
above, so there is no prior art to reuse here:
- `@solana/idl`'s `reconstructBufferData` grows the array to fit each chunk and then reads the extent back as the
  length (`dist/index.js:509-537`, then `next.dataLength = bufData.length` at `:609`). No coverage check, no
  execution-position bound.
- PR #90's PMP `applyWrite` sizes to `requiredSize = writeOffset + rawData.length`. It tracks `bufferBytesWritten`
  alongside, but that is a running SUM, so it cannot separate a gap from an overlap either.

With that shortcut the coverage check is circular: a pruned tail write shrinks the target, the check passes against
the shrunken target, and truncated content renders as complete. Two branches replace it, and they are not two
variants of one algorithm.

**Branch A - the viewed tx IS the metadata account's current state.** Read that account live. Its header carries
`data_length: u32` and the bytes (`getMetadataDecoder`), so this is retention-independent. It SUPERSEDES replay
rather than feeding it a length: it yields the bytes, so no `write` history is fetched at all.

The current-state test has to be explicit, because getting it wrong attributes a later payload to an earlier tx.
Four gates, and all four are load-bearing:
- The live read must return an account. `close` CAN close a metadata account, not only a buffer (upstream
  `processor/close.rs` has an explicit `Metadata` arm), so a `null` read DECLINES branch A instead of proving
  anything about the viewed tx.
- The account must actually be a `Metadata`. `getMetadataDecoder()` decodes a `Buffer` account without complaint and
  reports `dataLength` 0, because `Header`'s `data_length` at `[87..91)` sits inside `Buffer`'s padding at
  `[82..96)`. Check the discriminator before trusting the decode.
- The viewed transaction must have SUCCEEDED. A failed `setData`/`initialize` wrote nothing, so the live account
  state is not that instruction's result.
- Nothing after the viewed execution position may have changed the payload. Only `setData`, `initialize` and `close`
  can - `write` demands the `Buffer` discriminator and so cannot touch a finalized `Metadata` account, `extend` grows
  the account without touching `data_length`, `trim` reallocs to `96 + data_length` and refunds rent, and
  `setAuthority`/`setImmutable` are header-only (all verified in the processors, see 1). So the test is "no PMP
  `setData`, `initialize` or `close` targeting the metadata account at any execution position AFTER the viewed one",
  not "no later activity at all", which keeps it cheap in the common case:
  - one `getSignaturesForAddress` on the metadata account. A newest signature at or before the viewed execution
    position proves current state outright.
  - otherwise inspect the newer txs for a `setData`/`initialize`/`close` on that account, under reconstruction's
    page cap.
  - if the cap is exhausted before the newer txs are cleared, DECLINE branch A and take branch B. Never assume it.

**Branch B - a historical view.** Replay the account's own `write` history and derive the length from BOUNDS on the
account's size at the viewed execution position. There is no preferred anchor and no "which anchor wins" question -
the length comes from where the two bounds meet, or it is not pinned at all.

LOWER bounds on the account's size at the viewed instruction:
- the size the genesis System `createAccount` created the account at
- `96 + sum(extend.length)`
- `96 + max(write.offset + chunk.length)` over recoverable writes, because `write` auto-grows the account

A forward size replay in execution order over creation, `allocate`, `extend` and `write` auto-grow yields the
greatest of these. RPC retention can only make a lower bound too SMALL, never too large. NONE of them is exact, and
none may be labelled exact:
- `getUpdateBufferInstructionPlan` rewrites a LIVE buffer with no `allocate` and no `close`, so a stale creation
  size sits at or above the surviving coverage. Accepting it as exact truncates the payload and reports it complete,
  which is precisely the bug.
- the `extend` chain UNDERCOUNTS twice over. `getExtendInstructionPlan` takes `extraLength`, not a total, and on the
  update paths the client passes a size DELTA (`updateBuffer.ts:49-56`, `updateMetadata.ts:166-174` and `:234-242`
  pass `sizeDifference`, not the payload length). On top of that kit's realloc packer emits a trailing ZERO-LENGTH
  `extend` when the total is an exact multiple of `REALLOC_LIMIT = 10_240`, so the chain sums to `totalSize - 10240`.
- the write extent is exactly the circular quantity above.

UPPER bound: the account's rent-exempt BALANCE, which is the only observation that can PROVE a length. Rent
exemption is runtime-enforced on every resize, which `processor/write.rs` relies on explicitly ("must be rent exempt
(pre-funded account) since we are reallocating the account (checked by the runtime)"). Balances come from
`meta.preBalances`/`postBalances`, which the viewed tx and every replayed tx already carry, so the bound costs 0
extra RPC on both the fast path and the fallback. It is valid ONLY when some non-zero balance was observed at or
AFTER the account reached its final size, because an account may grow and close inside one transaction with no
top-up and a zero post-balance is an allowed rent state. A derived candidate MUST be confirmed against
`getMinimumBalanceForRentExemption` rather than a hardcoded lamports-per-byte rate: kit ships a local
implementation (`dist/index.node.mjs:162-170`, `ACCOUNT_STORAGE_OVERHEAD` 128n, `DEFAULT_EXEMPTION_THRESHOLD` 2n,
`DEFAULT_LAMPORTS_PER_BYTE_YEAR` 3480n, so 6960 lamports per byte), but those are the pre-SIMD-0194 defaults and
rent parameters are genesis-configurable rather than protocol constants.

Verdicts:
- `lower == upper` -> the length is PINNED, and the result MAY be reported `complete`, provided coverage has no
  interior gap, no unrecoverable range and no unorderable conflict.
- `upper > lower`, or no upper bound was observed -> nothing pins the length, so the result is `best-effort` ("may
  be truncated"), never `complete`.
- `upper < lower` -> impossible for a rent-exempt account of that size, so the UPPER BOUND IS DECLINED rather than
  applied, and the result is `best-effort`. This is the self-test for rent-parameter drift.
- Nothing may shorten the reconstruction below the replayed size. A candidate below it is declined, not applied.

`initialize` in-place takes its length from the ACCOUNT, not from the writes: `processor/initialize.rs` sets
`data_length = metadata.data_len() - 96` at initialize time. The bounds above therefore apply unchanged, with the
metadata PDA as the target account.

**The replay cannot filter to PMP-only instructions.** Two of the bound inputs live outside the program entirely. The
creation size is a System `createAccount` (`space` is a u64 at ix data bytes `[12..20)`, and the created account sits
at ACCOUNT INDEX 1, not 0), and the rent bound comes from `meta.preBalances`/`postBalances`. A replay that filters
`programId == PMP && accounts[0] == account` structurally cannot see either, so scan System `createAccount`
instructions targeting the account and read the balances in the same pass. Note that PMP `allocate`'s own inner
account creation is `CreateAccountAllowPrefund` (discriminator 13, new account at index 0), NOT System
`CreateAccount` (discriminator 0, new account at index 1), so a faithful disc-0 scan already excludes it.

Honest guarantee: detect and surface missing genesis (`allocate` not observed), interior coverage holes, ranges
covered only by an unrecoverable `sourceBuffer` write, an unorderable conflicting overlap, and any tail the bounds
do not account for. The remaining blind spot is an account whose observed balances all sit strictly ABOVE the rent
minimum for the replayed size, or that grew and closed inside one transaction so no balance was ever observed at its
final size, viewed historically with a pruned tail. That combination leaves the length unpinned and MUST be surfaced
as `best-effort` ("may be truncated, corroborate with archival RPC"), never as `complete`.

**The one true blocker is RPC history retention.** Public/free nodes prune old transaction history, so an old
buffer's `write` txs may be gone -> reconstruction is physically impossible regardless of algorithm. Detect the
detectable cases (missing `allocate` genesis, or writes not covering `[0, dataLength)` where the length was pinned by
equal bounds) and surface "reconstruction incomplete, needs archival RPC" - never render partial bytes as complete.
The unpinned case degrades to the `best-effort` "may be truncated" state, not a false `complete`. Execution-position
scoping, execution-order assembly, overlap classification, and the 96-byte offset are correctness detail on top.

Build cost: a self-contained helper using the existing `Connection`, roughly 120-160 lines split three ways (the
paging replay, the pure `deriveLength`, and the pure `assemble` + coverage classifier). The bounds derivation is what
puts it above the ~40-60 lines a bare write-replay would take, and it is the part neither prior implementation has.
`@solana/idl` publicly exports `reconstructPmpHistory` and `fetchAllHistories`, but `reconstructBufferData` itself is
internal, and it is neither position-scoped nor upper-bounded, and PR #90's replay is not in this checkout, so this is
a fresh build either way.

Network cost for one account up to the viewed position: `1` signatures call (a buffer has few sigs, fits one
1000-signature page) plus `N` `getTransaction` calls where `N ~= payload_size / chunk_size` (chunk ~1 KB, bounded by
the ~1232-byte tx). A few-KB payload is a handful. A 100 KB IDL is ~100-200 calls, batched in parallel chunks of 25.
Inline case = 0.

Numeric caps, all configurable knobs rather than literals sprinkled through the code, with these defaults:
- decoded render cap: 256 KB
- bounded inflate output cap: 1 MB
- signature history: 1000 per page, at most 10 pages
- concurrent `getTransaction` batch: 25
- External resolved length cap: 256 KB
- Url response cap: 4 MB, timeout 10 s (matching the existing metadata proxy's own bounds)

#### `setData` from a foreign buffer account (`data` empty, `buffer` idx 2 != PMP id) (reconstructBufferAtPosition)

The instruction references a buffer account but carries no inline data. A live `getAccountInfo` on the buffer is
not viable - the client closes it right after `setData`, so it returns null. Two options:

- Option A - our own position-scoped replay helper. ~40 lines, self-contained, uses the explorer's existing RPC.
  Bounded by the viewed transaction's execution position (fixes the reused-buffer bug, see 6). PR #90's
  `replayBufferWrites` is NOT in this checkout, so this is a from-scratch build.
  - Reconstruct by OFFSET-PATCHING into a `data_length`-sized buffer, not by sequential append. The `write` ix
    `offset` field is the LOGICAL 0-based data offset - patch at `offset` (NO +96, the +96 only applies to raw
    account slicing). Apply in execution order `(slot, transactionIndex, ix index)`, which is a no-op for disjoint
    ranges and load-bearing for a conflicting overlap (see the assembly-order rule above and 6).
  - DERIVE `data_length` inside the helper from the bounds above and RETURN it with its bounds. The helper takes no
    `dataLength` parameter, so a caller cannot inject an unpinned length and get a `complete` verdict back. Detect +
    surface `incomplete` on a missing `allocate` genesis, an interior coverage gap, or a `sourceBuffer` write whose
    bytes are unrecoverable, and the `best-effort` "may be truncated" state when the bounds do not meet - do NOT
    render partial bytes as complete.
  ```ts
  // Exclusive union - `ambiguous` is a status VALUE, not a flag layered onto another status.
  type Status = 'complete' | 'incomplete' | 'ambiguous' | 'best-effort';
  type LengthBounds = { lower: number; upper: number | null; pinned: boolean };
  type Reconstruction = { bytes: Uint8Array; dataLength: number; bounds: LengthBounds;
                          status: Status; reason?: string };

  // No `dataLength` parameter by design - see the bounds rule above. `viewedTx` is the already-fetched tx the card
  // is rendering, used for its `preBalances` entry (the rent upper bound) at 0 extra RPC.
  async function reconstructBufferAtPosition(conn, account, viewedPos, viewedTx): Promise<Reconstruction> {
    const sigs = (await conn.getSignaturesForAddress(account, { limit: 1000 }))
      .filter(s => !s.err && s.slot <= viewedPos.slot); // newest-first; same-slot txs still need ordering, see below
    const writes = [];                                  // {offset, chunk} + (slot, txIndex, ixIndex) order keys
    const balances = [preBalanceOf(viewedTx, account)]; // rent-bound observations, viewed tx first (close-in-same-tx)
    let genesisSpace = null;                            // System createAccount.space - a LOWER bound
    let extendedSize = null;                            // 96 + sum(extend.length) - a LOWER bound, it undercounts
    for (const batch of chunk(sigs, 25)) { // parallel, rate-limit friendly
      // NO `encoding` option here: web3.js v1 getTransaction has none, and passing one is forwarded to the RPC by
      // _buildArgs, then fails superstruct validation and throws. Raw bytes live on the returned message anyway.
      const txs = await Promise.all(
        batch.map(s => conn.getTransaction(s.signature, { maxSupportedTransactionVersion: 0 })));
      for (const tx of txs) {
        if (!orderableAgainst(tx, viewedPos)) continue;     // same slot, no transactionIndex -> exclude and flag
        balances.push(...nonZeroBalancesOf(tx, account));   // meta.pre/postBalances for this account
        // ix.data comes from tx.transaction.message.compiledInstructions[].data (Uint8Array), no encoding option.
        for (const ix of ixsTargeting(tx, account)) {       // NOT PMP-only - see the System note above
          if (ix.programId === SYSTEM && ix.disc === CreateAccount) genesisSpace = ix.space; // account idx 1, not 0
          else if (ix.programId !== PMP) continue;
          else if (ix.disc === Allocate) { /* session boundary - see reused-buffer scoping in 6 */ }
          else if (ix.disc === Extend) extendedSize = (extendedSize ?? HEADER_LEN) + ix.length;
          else if (ix.disc === Write && ix.chunk === null) markUnrecoverable(ix.sourceBuffer); // unwrapOption -> null
          else if (ix.disc === Write) writes.push(ix); // logical offset, no +96
        }
      }
    }
    const bounds = deriveLength({ genesisSpace, extendedSize, balances, coverage: extentOf(writes) });
    return assemble(writes, bounds); // offset-patch in execution order, then coverage-check against the bounds
  }
  // assemble() patches at the logical offset and records each written range, so it can tell a disjoint write from
  // an idempotent duplicate and from a conflicting overlap, set status 'ambiguous' when the ordering keys cannot
  // resolve one, and fall to 'best-effort' when deriveLength did not pin the length.
  ```
- Option B - reuse `@solana/idl`. Its public surface is `reconstructPmpHistory` + `fetchAllHistories`, while
  `reconstructBufferData` itself is INTERNAL and is not position-scoped. Reuse would need a contribution (export
  `reconstructBufferData` + add an execution-position bound).

Use `getTransaction` here, NOT `getParsedTransaction`, but not because the parsed form drops the bytes - PMP has no
RPC-side parser, so its instructions arrive as `PartiallyDecodedInstruction` with base58 `data`. The real reason is
the NON-UNIFORM shape: the System `createAccount` the lower-bound scan needs comes back `jsonParsed` with no raw
data at all, so one pass cannot read both. `getTransaction` gives a uniform `message.compiledInstructions[].data`
for every instruction, with no `encoding` option involved (web3.js v1 has none - see the snippet above).

`initialize` in-place uses the SAME helper, targeting the metadata PDA (`accounts[0]`) instead of a foreign
buffer: `reconstructBufferAtPosition(conn, metadataPda, viewedPos, viewedTx)`. No separate buffer account exists -
writes accumulated on the metadata PDA itself (the common "metadata-PDA-as-buffer" create flow behaves the same).

#### P2 fast path - Triton `getTransactionsForAddress` (full mode)

We run Triton as the production main RPC, so in production this is the PRIMARY reconstruction path - the standard
two-step (`reconstructBufferAtPosition` above) is the FALLBACK for non-Triton clusters (devnet/testnet, a custom URL,
or a user's own RPC). Triton's `getTransactionsForAddress` (also served by Helius) returns full transactions WITH
instruction data in one filtered, ordered, paginated call, so it collapses the `1 + N` fan-out and pushes the slot
bound server-side. The repo already calls this method in `app/providers/accounts/history.tsx` (today in
`transactionDetails: 'signatures'` mode) and already has the try-then-fallback wiring (JSON-RPC `-32601` ->
`getSignaturesForAddress`), so the fallback is not new infra.

| Dimension | Triton `getTransactionsForAddress` (full) | `getSignaturesForAddress` + N x `getTransaction` |
|---|---|---|
| Round-trips for N write txs | ~ceil(N / 100) at the full-mode page cap, so N <= 100 is 1 request | 1 + N |
| Raw instruction bytes in one call | Yes - `encoding: 'base64'`, decode `write` chunks from the raw tx | No - signatures only, then re-fetch each tx |
| Position bounding (at or before the viewed ix) | `filters.slot.lte` server-side, then a `transactionIndex` post-filter | Client-side, and a same-slot tx cannot be ordered at all |
| Same-slot ordering | Deterministic via `slot` + `transactionIndex`, `sortOrder: 'asc'` | No intra-slot index, so an unorderable same-slot tx is excluded and flagged |
| Availability | Triton / Helius only (`-32601` elsewhere) | Universal |
| Ease | One filtered, ordered, byte-carrying call per page | Two-step fan-out + manual position filter |

The page cap is MODE-specific, not provider-specific: 100 in `full` mode, 1000 in `signatures` mode. Keep it
configurable rather than hardcoded. `commitment` defaults to `finalized`. The `paginationToken` (`"slot:position"`) is
scoped to the query filters, so do not reuse it across different filters.

```ts
// Fast path: one filtered, ordered, byte-carrying call per page. Same derive-then-assemble shape as the standard
// path, and likewise NO `dataLength` parameter - it collects the same bound inputs and returns the length.
async function reconstructViaTriton(url, account, viewedPos, viewedTx): Promise<Reconstruction> {
  const writes = [];                                 // patched in (slot, transactionIndex, ix index) order
  const balances = [preBalanceOf(viewedTx, account)];
  let genesisSpace = null, extendedSize = null;
  let paginationToken: string | null = null;
  do {
    const res = await rpc(url, 'getTransactionsForAddress', [account, {
      transactionDetails: 'full',
      encoding: 'base64',
      maxSupportedTransactionVersion: 0,            // REQUIRED: without it the call returns legacy-only or fails,
                                                    // and since the fallback is gated on -32601 that failure escapes
      sortOrder: 'asc',                             // oldest-first replay
      filters: { slot: { lte: viewedPos.slot } },   // server-side slot bound, then order by transactionIndex below
      limit: 100,                                    // full-mode page cap (signatures mode allows 1000)
      paginationToken,
    }]);
    for (const item of res.data) {                   // item = { slot, transactionIndex, transaction, meta }
      if (!atOrBefore({ slot: item.slot, txIndex: item.transactionIndex }, viewedPos)) continue;
      const tx = decodeBase64Tx(item.transaction);
      balances.push(...nonZeroBalancesOf(item.meta, account)); // full mode returns meta, so the bound is free here too
      for (const ix of ixsTargeting(tx, account)) {  // item.transactionIndex resolves same-slot order here
        if (ix.programId === SYSTEM && ix.disc === CreateAccount) genesisSpace = ix.space; // account idx 1, not 0
        else if (ix.programId !== PMP) continue;
        else if (ix.disc === Allocate) { /* session boundary, reset - see 6 */ }
        else if (ix.disc === Extend) extendedSize = (extendedSize ?? HEADER_LEN) + ix.length;
        else if (ix.disc === Write && ix.chunk === null) markUnrecoverable(ix.sourceBuffer); // unwrapOption -> null
        else if (ix.disc === Write) writes.push(ix);  // logical offset, NO +96
      }
    }
    paginationToken = res.paginationToken;           // walk until null
  } while (paginationToken);
  return assemble(writes, deriveLength({ genesisSpace, extendedSize, balances, coverage: extentOf(writes) }));
}

// Pick the fast path, fall back on method-not-found. Mirrors history.tsx's -32601 probe.
async function reconstructBuffer(url, conn, account, viewedPos, viewedTx): Promise<Reconstruction> {
  try {
    return await reconstructViaTriton(url, account, viewedPos, viewedTx);
  } catch (e) {
    if (!isMethodNotFound(e)) throw e;               // -32601 only, anything else is a real error
    return reconstructBufferAtPosition(conn, account, viewedPos, viewedTx); // standard two-step (see above)
  }
}

// rpc(): raw JSON-RPC POST. Throw an Error with `.code = json.error.code` so isMethodNotFound can see -32601.
// isMethodNotFound and the -32601 fallback pattern already exist in app/providers/accounts/history.tsx.
```

Both paths MUST assemble identical bytes (offset-patched, position-bounded, session-scoped, sized by the same length
bounds) whenever no conflicting overlap sits inside a single slot. The bound inputs are available on both, so a
path difference in the derived `data_length` is a bug, not a limitation: the fast path reads balances from
`item.meta` and the fallback from each `getTransaction`'s `meta`, and both see the genesis System `createAccount`
and the `extend` chain. Where a same-slot conflicting overlap does sit, only the fast path can order it, so the
fallback MUST report status `ambiguous` rather than return bytes that silently disagree. A test pins both
halves - see the `p2-program-metadata-buffer-reconstruction` spec.

### 4.3 write chunk (0 RPC)

`write` is a fragment with NO hints, so it cannot be decoded to a document on its own. Show `offset` + the raw
chunk (hex/base64) via `getWriteInstructionDataDecoder()`. If `data` is empty and a `sourceBuffer` (idx 2) is set,
the chunk was copied from another buffer - show the `sourceBuffer` address + a note, do not reconstruct here.

#### The chunk itself (inline) - 0 RPC

Decode the args and show `offset` + the raw chunk bytes (hex/base64). Arg decode is a library call, no custom
parsing:

```ts
import { getWriteInstructionDataDecoder } from '@solana-program/program-metadata';
import { unwrapOption } from '@solana/kit';

type WriteChunk = { offset: number; data: Uint8Array | null; fromSourceBuffer: boolean };

// `accounts` are Codama account METAS ({ address, role, name }), so the source-buffer test reads `.address`.
function parseWrite(ix: { data: Uint8Array; accounts: { address: Address }[] }): WriteChunk {
  const { offset, data } = getWriteInstructionDataDecoder().decode(ix.data); // offset:u32, data:Option<bytes>
  const inline = unwrapOption(data); // NOTE: unwrapOption(None) returns null, NOT undefined
  // The decoder's `data` field is a REMAINDER option, so some(new Uint8Array(0)) and none() encode to the SAME
  // 5 bytes. Account index 2 is therefore the ONLY way to tell a sourceBuffer write from a zero-length inline
  // write - the accounts[2] check is load-bearing, not a redundant belt on the null check.
  return { offset, data: inline, fromSourceBuffer: inline === null && ix.accounts[2]?.address !== PMP };
}
```

Source: this mirrors PR #90's `parseWrite`, which uses the same `getWriteInstructionDataDecoder()`. (PR #90 is not
in this checkout, but the decoder is the installed library.)

## 5. Data sources and rendering

### dataSource matrix

`dataSource` (how to interpret the bytes) is orthogonal to where the bytes come from (inline arg vs buffer). In
practice only `Direct` ever uses a buffer - a URL string or an `ExternalData` pointer is tiny and fits inline.

| `dataSource` | `encoding` + `compression` apply to | Buffer account? | Data argument? |
|--------------|-------------------------------------|-----------------|----------------|
| `Direct` | the payload bytes -> the decoded string IS the content | Yes - large payloads chunked via a foreign buffer (setData) or the in-place metadata PDA (initialize) | Yes - small payloads inline |
| `Url` | the payload bytes -> the decoded string is a URL, then HTTP `fetch` | Possible but unused in practice (a URL is tiny) | Yes - inline (the URL string) |
| `External` | the FETCHED external account's bytes, NOT the pointer (the pointer is stored plain) | Possible but unused (the pointer is exactly 40 B, enforced on-chain). The real content lives in a SEPARATE account fetched LIVE via `getAccountInfo` | Yes - inline (the `ExternalData` pointer `{address, offset, length}`) |

### Rendering

- `Direct` - the decoded string IS the content (P1 inline, P2/P3 reconstructed).
- `Url` - the on-chain bytes decode to a URL, then fetch that URL and render its content per `format` (P4), always
  showing the source URL as a scheme-safe link. Guard the fetch: http(s)-only, size cap, timeout, graceful
  CORS/failure. Client-side cross-origin reads are often CORS-blocked, so route through the repo's server-side
  metadata proxy (`app/api/metadata/proxy`) when needed.
- `External` - the pointer is an exactly-40-byte `ExternalData{address: 32, offset: u32, length: u32}` and the
  program enforces that size on-chain (`DataSource::External` accepts only `ExternalData::LEN`), so validate the
  length before decoding it with `unpackExternalData`. `length` is a zeroable option, so all-zeroes decodes as None
  and means "to the end of the account", not an empty slice. Fetch the account with a bounded
  `dataSlice: {offset, length: cap + 1}` so the RPC caps the transfer server-side, decode with
  `encoding`/`compression` through the bounded inflate, and render per `format` (P3). The fetched content is
  live/current-state, not point-in-time.

Per-format rendering, all inside `<pre>`/`<code>`, showing encoded + decoded side by side (raw via
`app/components/shared/HexData.tsx`, which is fine BELOW the render cap and unusable above it - see 6):
- `Json` -> `JSON.parse` (size-capped before parse) then `JSON.stringify(obj, null, 2)`, falling back to the raw
  string on parse error.
- `Yaml` / `Toml` -> verbatim (no parser lib pulled in).
- `None` -> verbatim. Encoding None yields hex (binary, not text).
- A collapsible JSON tree via `@microlink/react-json-view` (`SolarizedJsonViewer` in
  `app/components/common/JsonViewer.tsx`) is a later enhancement, not the first cut.

## 6. Risks and mitigations

Correctness:
- Reused buffer address -> unscoped replay attributes the latest lifecycle to an earlier `setData`. Fix: bound to the
  viewed transaction's execution position AND session-bound (writes after the last `allocate`/`close` before this
  `setData`).
- A buffer REWRITE carries no session boundary at all (`updateBuffer` emits neither `allocate` nor `close`), so
  session scoping alone does not separate the old write set from the new one. Fix: classify overlaps and let a
  conflicting overlap set status `ambiguous` rather than resolving it by luck.
- Same-slot ordering is non-deterministic from `getSignaturesForAddress` -> offset-patch a fixed-size buffer in
  execution order instead of appending sequentially, and use intra-tx ix order when writes share a tx. Harmless for
  disjoint ranges, unresolvable for a same-slot conflicting overlap, which is why a same-slot transaction that cannot
  be ordered against the viewed one is EXCLUDED and flagged rather than folded in.
- A `write` with empty inline `data` and a `sourceBuffer` copies bytes that are not in the transaction. Replay
  cannot recover them, so mark the range unrecoverable instead of patching an undefined chunk.
- A 4-byte header-only `setData` throws in `getSetDataInstructionDataDecoder()` (SolanaError "Codec [u8] cannot
  decode empty byte arrays"). Guard on the ix data length before decoding, otherwise a valid instruction renders as a
  decode failure. The generated ENCODER cannot build that shape either, so it only ever originates from the Rust CLI
  or a hand-rolled instruction - rare, but on-chain-valid.
- 96-byte offset: replay patches at the logical `offset` with no +96, and the +96 applies only to raw account
  slicing. Add a fixture that would catch a 96-byte shift.
- Decode failures degrade to a raw-bytes view. CATCH LOCALLY inside the Decoded Content section - do NOT let the
  throw bubble to the card-level `ErrorBoundary` (`IdlInstructionCard.tsx:34`), whose fallback is
  `UnknownDetailsCard` and would discard the correctly-parsed accounts + args (swap the WHOLE card to "unknown").
  `HexData` is NOT usable as the oversized-payload fallback: at `truncate:false` it renders every byte, and at
  `truncate:true` only 8 head plus 8 tail bytes, so neither mode gives a bounded-but-useful preview. The oversized
  state needs its own capped preview plus a download affordance.

Security:
- Decompression bomb: `uncompressData` runs pako inflate/ungzip with NO output bound - a few-KB compressed payload
  can inflate to gigabytes and freeze the tab. `pako` is in no render path today, so there is no guard to inherit.
  PROVENANCE decides the guard, and it also decides the PHASE: INLINE bytes are tx-bounded (~1 KB -> <=~1 MB), so P1
  Direct-inline and the P4 URL pointer call `unpackDirectData` directly, and P1 therefore ships the render-size cap
  and the local decode-error catch but NOT the bounded inflate. The OUTPUT-BOUNDED inflate requirement belongs to P2
  and P3, where buffer-sourced or fetched bytes are not transaction-size bounded. Those paths decompress through a
  bounded `pako.Inflate` whose `onData` accumulates output into a caller-owned array and THROWS past the cap - pako
  calls `onData` once per output chunk inside a single `push` and does not catch it, so the throw aborts the inflate
  loop (stops CPU work, not just accumulation). Set `chunkSize` explicitly, because the default is 64 KB (pako's own
  docstring saying 16 KB is stale) and it bounds how far past the cap a run can get. Check `ended`, not `err`, since a
  truncated stream leaves `err` 0. Then hand the bytes to the exported `decodeData`. A compressed-size / `data_length`
  pre-check bounds the INPUT only, not the inflated output, so it is a cheap early-out, not the guard. On exceed:
  render a capped raw preview + a "payload too large" note with a download affordance (not `HexData`, see above).
- Untrusted content: `JSON.parse` only for `Format=Json` (size-capped). YAML/TOML/text as plain text (no parser,
  no new attack surface). Keep the no-`dangerouslySetInnerHTML` invariant. Enforce a max render size.
- Url: fetch only `http(s):` URLs (render other schemes as plain text, never fetch), cap the response at 4 MB, set a
  10 s timeout, and surface CORS/network failures with the source link intact. The repo's server-side metadata proxy
  (`app/api/metadata/proxy`) bypasses CORS and centralizes SSRF/size controls, but it is not a drop-in for arbitrary
  PMP URLs: it accepts only `application/json`, `text/plain` that parses as JSON, and `image/*`, it RE-SERIALIZES
  JSON bodies so raw bytes never reach the client, and it 404s unless `NEXT_PUBLIC_METADATA_ENABLED` is `'true'`,
  which ships `false`. So P4 either extends the proxy or owns its own guarded route. Do NOT auto-fetch on render
  (privacy/SSRF beacon) - fetch behind the Decode action.
- External: bound `length` BEFORE fetching (DoS) by passing `dataSlice: {offset, length: cap + 1}` to
  `getAccountInfo`, so the RPC caps the transfer instead of the client discarding an oversized response. A slice
  that comes back full means the payload exceeded the cap. Fetch via the chosen single RPC stack, and treat a
  missing account as an unavailable state rather than a throw (the library's `assertAccountExists` throws).

## 7. Integration and open decisions

- Where the section renders is decided by two constraints, and both point AWAY from hooking the generic Codama card:
  - a 4-byte header-only `setData` never produces a Codama decode at all, so it reaches `UnknownDetailsCard` and a
    length guard hung off the Codama card can never run for the one shape that most needs it.
  - the whole card path is gated on RUNTIME PMP IDL resolution - `useIdlInstructionDecode` returns `undefined`
    without an IDL - while P1 needs no IDL at all, because the typed decoders are bundled with the library.
  So the section is keyed on `programId == PMP` (ix in `{setData, initialize, write}`) and rendered by a PMP-owned
  section, not by extending `CodamaInstructionCard`
  (`app/features/decode-instruction-with-idl/ui/CodamaInstructionCard.tsx`), which builds its account + arg table
  INLINE and does NOT compose `CodamaInstructionBody` (a separate, Lighthouse-only component).
- Both the tx page (`app/features/transaction/ui/InstructionsSection.tsx:191`) and the inspector
  (`app/components/inspector/InstructionsSection.tsx:125`) share `useIdlInstructionDecode`, so a program-id-keyed
  section placed alongside it still covers both surfaces at once.
- A reusable lazy on-demand SWR-over-`Connection` hook ALREADY exists at
  `app/entities/account/model/use-raw-account-data.ts:14-22` - follow it rather than inventing the pattern. (Note
  `useSecurityTxt` does NOT build a `Connection`, so it is not the model here.) `AccountHistory` (`history.tsx`) is
  still unusable from a card: page-scoped context/reducer, and `getParsedTransaction`-shaped.

OPEN (decide at planning):
- **FSD placement.** `app/entities/program-metadata/` already exists as the PMP FSD slice and is already in the
  decode path, so the open question is what lands there versus in a feature slice, not where the slice lives.
  Candidate seams: pure `decodePmpPayload(bytes, config) -> string`, plus `deriveLength(inputs) -> LengthBounds` and
  `assemble(writes, bounds) -> Reconstruction` (both RPC-free and unit-testable). Keep the bounds derivation as its
  own pure seam rather than folding it into assembly, so the length rule in 4.2 is testable on its own and no caller
  can pass a length in. Then the SWR fetch hook + UI section in a dedicated feature slice. NOTE:
  `app/features/metadata/` is Metaplex off-chain metadata, NOT PMP.
- **UI layout.** Where and how the Decoded Content section renders (placement, collapsing, the Decode button).
- **Single RPC stack.** Do not run two stacks in one feature. The choice is only WHICH client backs the
  hand-rolled External fetch, either a kit `Rpc` built from the cluster url or the web3 v1 `Connection` already used
  for sig/tx paging. Delegating to `unpackAndFetchData` is not an option on either stack (see 2), so a kit `Rpc`
  buys nothing here unless something else in the feature needs it. Direct (P1) needs no RPC at all.
Not open (recorded here because it used to be listed as open):
- **Compute placement is DECIDED: a client SWR hook over the user's cluster `Connection`.** `decode/unpack` and
  buffer reconstruction both run client-side. This uses no Next.js serverless compute, respects a custom RPC url, and
  needs no cluster/RPC pass-through, at the cost of local-only caching (SWR, in-memory/per-session), so repeated
  views re-reconstruct. A shared server-side cache of reconstructed buffers is a possible later optimisation, and it
  is the only thing a Next API route would buy: `decode/unpack` is pure and cheap (0 RPC for Direct). The P4 Url
  fetch stays the one server-side leg, since a cross-origin body fetch needs the proxy.

## 8. Suggested Delivery phases (P1-P4)

All four content paths are in scope. This is a delivery ordering by risk so the risky parts land isolated, not a
scope cut. Each phase is an independently shippable, reviewable unit.

- **P1 - Direct inline (0 RPC, no new deps).** `setData`/`initialize` inline decode via the typed decoders +
  `unpackDirectData`, encoded + decoded side by side. `write` shows `offset` + raw chunk. JSON pretty-print
  (size-capped), YAML/TOML/text verbatim, Encoding None -> hex. Guards baked in: the 256 KB render-size cap with a
  capped-preview/download fallback, and the LOCAL decode-error catch. P1 does NOT need the bounded inflate, because
  inline bytes are transaction-size bounded. Housekeeping ixs render accounts only.
- **P2 - Buffer reconstruction (behind a "Decode" button).** `setData` foreign-buffer + `initialize` in-place.
  New SWR hook -> `Connection` -> `getSignaturesForAddress` + `getTransaction`, with the Triton
  `getTransactionsForAddress` fast path in front of it. Execution-position bounded + session-bounded, offset-patched,
  with the explicit `incomplete` / `ambiguous` / `best-effort` states. Sig cap (1000 per page, 10 pages), batched
  fetch (25) + retry/backoff + loading state. P2 OWNS the output-bounded inflate, since reconstructed bytes are not
  transaction-size bounded. Carries the bulk of the correctness unit tests.
- **P3 - External data source.** Bounded live account fetch for `ExternalData`, on the same RPC stack as P2,
  behind the Decode button, decompressing through the same output-bounded inflate as P2.
- **P4 - Url data source.** Decode the on-chain bytes to a URL, show it as a scheme-safe link, and fetch + render
  its content per `format` behind the Decode action. Guard the fetch (http(s)-only, size cap, timeout, graceful
  CORS/failure). Client-side cross-origin fetches are often CORS-blocked, so route through the existing
  server-side metadata proxy (`app/api/metadata/proxy`) when needed.

## 9. Testing

Follow the Lighthouse pattern (`data-testid` assertions, suite names start with "should"): build a real raw
`setData` ix from on-chain bytes, decode through the real pipeline, assert the rendered `<pre>`. No payload fixture
exists to reuse - `app/features/decode-instruction-with-idl/ui/__stories__/IdlInstructionCard.stories.tsx` has only
`Allocate` and `SetAuthority` stories, both payload-free, so it is a rendering harness, not a fixture source. Factor
`reconstructBuffer(writes) -> bytes` and `decode(config, bytes) -> string` as RPC-free pure functions and unit-test
them directly. Fixtures and the outcome each one pins:
- out-of-order disjoint writes -> byte-identical to the in-order assembly.
- duplicate write, same range, same bytes -> idempotent, complete, not flagged.
- conflicting overlap across slots -> the later slot wins, complete.
- conflicting overlap inside one slot across two txs -> status `ambiguous` on the fallback, resolved by
  `transactionIndex` on the fast path. The two paths are allowed to differ here, and the fallback must say so.
- conflicting overlap inside one tx -> resolved by ix index on both paths.
- buffer rewrite with no `allocate`/`close` between the write sets -> the newer set wins, stale tail retained.
- `write` with empty data + `sourceBuffer` -> range marked unrecoverable, result incomplete.
- interior gap, missing `allocate` genesis, truncated history -> incomplete, never complete.
- 4-byte header-only `setData` -> hints render, no payload section, no decode error.
- 96-byte-shift and decompression-cap fixtures.

The length bounds (4.2) carry their own fixtures, because this is where a silent partial would slip through. Each one
pins the same thing from a different input: a missing TAIL write must never shorten the target length, and no lower
bound may ever be treated as exact.
- keypair-buffer genesis `createAccount.space` -> the creation size raises the LOWER bound above
  `max(offset + len)`, so it is honoured over the write extent.
- creation size + pruned TAIL write, no upper bound -> lower bound exceeds coverage -> `incomplete`. The dominant
  closed-foreign-buffer case, and the one `@solana/idl` and PR #90 both render as complete today.
- live buffer rewritten by `getUpdateBufferInstructionPlan` (no `allocate`, no `close`, shorter new payload) -> the
  stale creation size must NOT be trusted as exact, so the result is not `complete`.
- `extend` chain built from size DELTAS on the update path -> the summed chain is BELOW the real size, so it must
  never pin a length on its own.
- payload an exact multiple of `10_240` -> kit's trailing zero-length `extend` makes the chain sum to
  `totalSize - 10240`, and the reconstruction must not be shortened to it.
- rent upper bound equal to the replayed lower bound -> PINNED, and `complete` provided coverage is clean.
- rent upper bound above the lower bound (over-funded account, or a genuinely missing tail) -> `best-effort`, never
  `complete`.
- rent upper bound below the lower bound -> the upper bound is DECLINED, and the reconstruction is NOT shortened -
  no false complete from stale rent parameters.
- `setData` and the buffer `close` in ONE transaction with no top-up -> no balance was observed at the final size, so
  no upper bound is valid and the result is `best-effort`. A zero post-balance is a legal rent state, not a bound.
- derived candidate confirmed against `getMinimumBalanceForRentExemption`, not a hardcoded 6960.
- no upper bound at all (header-size creation, grown purely by `write`) -> `best-effort` "may be truncated", never
  `complete`, even when the writes look contiguous.
- a later `setData`/`initialize`/`close` on the metadata account -> the current-state test FAILS, branch A is
  declined, replay runs.
- a `null` live read of the metadata account -> branch A declined (a metadata account CAN be closed).
- a `Buffer`-discriminator account read through `getMetadataDecoder()` -> caught by the discriminator check, not
  trusted as `dataLength` 0.
- the viewed transaction FAILED -> branch A declined, the live state is not that instruction's result.
- newest metadata signature at or before the viewed execution position -> current state proven in one call, branch A
  supersedes replay and no `write` history is fetched.
- later `trim`/`setAuthority`/`setImmutable`/`extend` only, on a METADATA account -> current state still holds
  (payload-neutral there), so branch A is NOT declined by unrelated activity.
Mock `Connection` for the SWR hook.

## 10. Analytics (GA)

Intent + constraints only - the concrete module and final event names/params are fixed at planning/implementation.

Goal: measure whether people use the decoded-content feature. Fire GA events through the shared
`trackEvent(name, params)` (`app/shared/lib/analytics`), mirroring the feature-local analytics module pattern
(`app/features/idl/interactive-idl/lib/analytics.ts`, and shared `refresh.ts`/`receipt.ts`).

Events (names/params final at implementation):
- `pmp_decode_clicked` - user clicks "Decode" (P2/P3/P4). Params: `instruction`, `source`.
- `pmp_decode_completed` - decode/reconstruction/fetch resolves. Params: `instruction`, `source`, `format`,
  `outcome`. The `source` (`inline` vs `buffer`/`external`/`url`) distinguishes "just parsed" from "reconstructed".

Spec ownership: the p1 delta owns the INLINE path plus the "analytics unavailable" negative case, and p2, p3 and p4
each own ONE scenario for their own Decode trigger and outcome. p2 owns the extended `outcome` vocabulary, which is
`decoded` / `incomplete` / `ambiguous` / `best-effort` / `failed`.

Test by mocking `trackEvent` and asserting the event name + params.
