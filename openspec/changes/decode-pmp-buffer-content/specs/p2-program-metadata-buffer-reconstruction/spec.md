## ADDED Requirements

> Scope: buffer reconstruction (a foreign buffer for `setData`, the in-place metadata PDA for `initialize`) - phase
> P2 of the `decode-pmp-buffer-content` change. Builds on the `p1-program-metadata-content` capability (P1). See
> `design.md` §4.2.

### Requirement: buffer-sourced PMP payloads SHALL be reconstructed on demand and decoded

The card SHALL reconstruct a buffer-sourced payload (a `setData`/`initialize` instruction with an empty `data`
argument) by replaying the target account's `write` history up to the viewed transaction's slot, then decode the
assembled bytes with the instruction's `encoding`/`compression`/`format`. Reconstruction SHALL run only behind an
explicit user action, not automatically on render.

#### Scenario: `setData` sources bytes from a foreign buffer

- **WHEN** a `setData` instruction has empty `data` and its `buffer` account (index 2) is not the PMP program id
- **AND** the user triggers the "Decode" action
- **THEN** the card SHALL replay the `write` instructions targeting that buffer and render the decoded document
- **AND** SHALL show a loading state while fetching and the raw bytes alongside the decoded output

#### Scenario: `initialize` finalizes an in-place metadata buffer

- **WHEN** an `initialize` instruction has empty `data` (payload pre-written into the metadata PDA)
- **THEN** reconstruction SHALL target the metadata account itself (`accounts[0]`), not a separate buffer
- **AND** where the payload was written into that PDA by `write` instructions, the decoded document SHALL render the
  same way as the foreign-buffer case
- **AND** where the dominant flow applies - `getCreateMetadataInstructionPlanUsingExistingBuffer` covers the whole
  payload with a single `write` from a `sourceBuffer` and then closes that source - the bytes SHALL be recovered only
  when the depth-1 source-buffer recursion can replay the source account, and otherwise the covered range SHALL be
  reported unrecoverable rather than rendered

#### Scenario: reconstruction is not automatic

- **WHEN** a buffer-sourced `setData`/`initialize` instruction first renders
- **THEN** the card SHALL NOT fetch anything until the user triggers the "Decode" action

### Requirement: buffer reconstruction MUST be point-in-time bounded by the viewed execution position

Reconstruction MUST include only `write` chunks from the buffer's current session up to the viewed transaction's
EXECUTION POSITION - the triple (`slot`, `transactionIndex`, intra-transaction instruction index) - and MUST NOT bound
by slot alone, so neither a buffer reused later in the viewed slot nor an instruction later inside the viewed
transaction can attribute bytes to the viewed `setData`. The cut MUST fall at the viewed instruction's index INSIDE
the viewed transaction, because `setData` and the buffer's `close` routinely share one transaction and applying that
`close` would wipe the session just assembled. A same-slot transaction that executed after the viewed one MUST be
excluded, and when the keys available on the path in use cannot order it against the viewed transaction it MUST still
be excluded and the result flagged, never folded in.

#### Scenario: the buffer address was reused after the viewed transaction

- **WHEN** the buffer was closed and re-allocated for a different payload after the viewed execution position
- **THEN** reconstruction SHALL exclude every write at or after that position
- **AND** SHALL exclude writes from a prior session before the most recent `allocate`/`close` that opened this one

#### Scenario: the viewed transaction also closes the buffer

- **WHEN** the viewed `setData` and a `close` of the same buffer sit in one transaction, `setData` first
- **THEN** the replay SHALL stop at the viewed instruction's index and SHALL NOT apply that `close`
- **AND** the session assembled before the viewed instruction SHALL survive, whether history arrived oldest-first or
  newest-first

#### Scenario: writes are observed out of order

- **WHEN** the `write` transactions are fetched in a non-sequential order
- **THEN** each chunk SHALL be placed at its logical `offset` in a fixed-size buffer
- **AND** the assembled result SHALL be independent of fetch order for non-overlapping writes

#### Scenario: a session boundary shares a slot with a write

- **WHEN** an `allocate`/`close` session boundary and a `write` for the same account land in the same slot
- **THEN** reconstruction SHALL order them by intra-transaction index when they share a transaction, and by
  `transactionIndex` when the path in use provides it
- **AND** where neither key is available the assembly SHALL be flagged as unorderable instead of ordered by guess,
  and the `write` SHALL NOT be silently dropped or attributed to the wrong session

#### Scenario: a same-slot transaction cannot be ordered against the viewed one

- **WHEN** another transaction touching the account lands in the viewed slot and the path in use exposes no
  `transactionIndex`
- **THEN** that transaction SHALL be excluded from the replay
- **AND** the result SHALL record the exclusion as a flag and SHALL NOT be reported complete

### Requirement: the replay's observation set MUST be normalised before any derivation runs

Observations MUST be sorted into execution order (`slot`, then `transactionIndex` when the path provides it, then
intra-transaction instruction index) BEFORE any session scoping, coverage accounting or length derivation runs, and
independently of the order the RPC delivered them, because `getSignaturesForAddress` delivers newest-first while the
Triton fast path delivers oldest-first and an unsorted in-iteration accumulator derives different bounds and different
session membership per path. Only transactions that SUCCEEDED (`meta.err == null`) MUST enter the replay, because a
failed `close` or `allocate` never took effect and applying it would reset the session and collapse the reconstruction
to zero recovered bytes. The replay MUST walk `meta.innerInstructions` as well as the outer instructions: a missed
CPI-issued `write` only shows up as a coverage gap, which is merely conservative, but a CPI-issued later `setData`
missed by the current-state test produces a FALSE complete, so the current-state scan MUST walk inner instructions.

#### Scenario: the two paths deliver history in opposite orders

- **WHEN** the same history is delivered newest-first by `getSignaturesForAddress` and oldest-first by the fast path
- **THEN** both SHALL be sorted into execution order before the first session boundary is applied
- **AND** a `close` that ended a PREVIOUS lifecycle SHALL NOT wipe the current session's writes on either path

#### Scenario: a failed transaction touches the account

- **WHEN** a transaction that `close`s or `allocate`s the account failed on chain
- **THEN** it SHALL be excluded from the replay
- **AND** the session it would have reset SHALL be left intact

#### Scenario: a `write` is issued by CPI

- **WHEN** a `write` targeting the account appears only in `meta.innerInstructions`
- **THEN** the replay SHALL apply it rather than reporting the range it covers as a gap

#### Scenario: a later `setData` is issued by CPI

- **WHEN** a `setData` targeting the metadata account after the viewed execution position appears only in
  `meta.innerInstructions`
- **THEN** the current-state test SHALL see it and the live read SHALL be declined
- **AND** the reconstruction SHALL NOT be reported complete on the strength of an apparently unchanged current state

### Requirement: the replay MUST match instructions by account role, not by address alone

An instruction MUST enter the replay only when the account under reconstruction occupies that instruction's TARGET
index, because a `write` names its source buffer at `accounts[2]` while targeting a different account and an
address-only filter therefore poisons the reconstruction of an account that instruction never wrote to. Target
indices: `write`, `allocate`, `extend`, `trim`, `close`, `setAuthority` and `setImmutable` target `accounts[0]`,
`setData` targets `accounts[0]` with its source buffer at `accounts[2]`, and `initialize` targets `accounts[0]`. The
`accounts[2]` source buffer of `write` and `setData` is never a target. Instruction account indices and the
`preBalances`/`postBalances` indices MUST be resolved through the transaction's address lookup tables, because two of
the three lower bounds and the whole upper bound depend on resolving indices in a versioned transaction.

#### Scenario: the account appears as another instruction's source buffer

- **WHEN** a `write` names the account under reconstruction at `accounts[2]` and a different account at `accounts[0]`
- **THEN** that `write` SHALL NOT be counted as coverage of the account under reconstruction
- **AND** SHALL NOT contribute to that account's replayed size

#### Scenario: the account is loaded from an address lookup table

- **WHEN** the account under reconstruction is supplied by a versioned transaction's address lookup table
- **THEN** the replay SHALL resolve the loaded addresses before matching target indices and before reading balances
- **AND** SHALL NOT skip the transaction or attribute a balance to the wrong account

### Requirement: assembly MUST follow execution order and conflicting overlaps MUST be surfaced

Chunks MUST be assembled in on-chain execution order (`slot`, then `transactionIndex` when the RPC provides it,
then intra-transaction instruction index), because the `write` instruction is last-writer-wins. Order-independence
is a property of disjoint ranges, not a guarantee of the algorithm. Reconstruction MUST classify an intersecting
range as an idempotent duplicate when its bytes match and as a conflicting overlap when they differ, and MUST set the
status to `ambiguous` when a conflicting overlap cannot be ordered by the keys available on the path in use. Whether
an unambiguous assembly may be reported complete is decided by the length rule below, not by the absence of conflict.

#### Scenario: two writes cover the same range with identical bytes

- **WHEN** a write is observed twice with the same offset and the same bytes
- **THEN** the intersecting range SHALL be treated as an idempotent duplicate and covered once
- **AND** the status SHALL NOT be `ambiguous`

#### Scenario: a conflicting overlap can be ordered

- **WHEN** two writes cover an intersecting range with different bytes and are ordered by slot, by `transactionIndex`,
  or by intra-transaction index
- **THEN** the later write SHALL win for the intersecting bytes
- **AND** the status SHALL NOT be `ambiguous`, while the length rule still decides whether the result may be reported
  complete

#### Scenario: a conflicting overlap cannot be ordered

- **WHEN** two writes cover an intersecting range with different bytes, land in the same slot in different
  transactions, and the path in use provides no intra-slot index
- **THEN** the card SHALL report the status `ambiguous`
- **AND** SHALL NOT present either candidate assembly as complete

#### Scenario: the buffer is rewritten with no session boundary between the write sets

- **WHEN** a live buffer is written again with new content and neither `allocate` nor `close` separates the old write
  set from the new one
- **THEN** the newer writes SHALL win by execution order
- **AND** session scoping alone SHALL NOT be relied on to separate the two sets

### Requirement: incomplete or unavailable reconstruction MUST be surfaced, never shown as complete

The card MUST surface an explicit incomplete or unavailable state when the required `write` history is missing (RPC
history pruned) or does not cover the derived length, and MUST NOT present partial bytes as the full decoded document.
The reported status MUST be exactly one value of the exclusive union `complete` | `incomplete` | `ambiguous` |
`best-effort`, so ambiguity is a status value rather than an independent flag and compound labels MUST NOT be
produced.

#### Scenario: RPC history is pruned

- **WHEN** `getSignaturesForAddress`/`getTransaction` cannot return the buffer's `write` transactions
- **THEN** the card SHALL show a "reconstruction incomplete, may require archival RPC" state
- **AND** SHALL fall back to the raw view rather than a partial or blank document

#### Scenario: reconstructed writes leave a gap

- **WHEN** the recovered writes do not cover the full `[0, derived length)` range
- **THEN** the card SHALL mark the result incomplete
- **AND** SHALL NOT render the partial bytes as a successfully decoded document

#### Scenario: a replayed write copies from a source buffer

- **WHEN** a `write` instruction in the replay carries a source buffer at `accounts[2]`, so its bytes live in another
  account rather than in the transaction, and its extent is therefore UNKNOWN (the encoded `data` remainder option
  cannot tell `some(empty)` from `none()`, so `accounts[2]` is the only discriminator)
- **THEN** the unrecoverable interval SHALL be recorded as `[offset, dataLength)` when a length is available and as an
  unbounded tail from `offset` otherwise, and SHALL NEVER be recorded as a zero-length range
- **AND** the result SHALL be marked incomplete and SHALL NOT be patched with placeholder or undefined bytes

### Requirement: a live read of the metadata account MUST supersede replay only when it is provably current

When the viewed transaction is the metadata account's current state, a live read of that account MUST supersede replay
entirely, supplying both the length and the bytes. The payload-changing set for the current-state test MUST be
`setData`, `initialize` and `close` - `close` belongs in it because the upstream `processor/close.rs` has an explicit
Metadata arm, so a metadata account and not only a buffer can be closed. The test MUST therefore be whether any PMP
`setData`, `initialize` or `close` targets the metadata account after the viewed EXECUTION POSITION, and it MUST be
declined rather than assumed when the scan cannot be completed within the configured cursor budget. The live read MUST
also be declined when the account does not exist, and the fetched account's discriminator MUST be checked as
`Metadata` before its `data_length` is used, because `getMetadataDecoder()` decodes a Buffer account without complaint
and returns `dataLength` 0 (Header's `data_length` at `[87..91)` sits inside Buffer's padding at `[82..96)`). The whole
branch MUST be gated on the viewed transaction having SUCCEEDED, because a failed `setData` never wrote the payload
the live account holds.

#### Scenario: the current-state payload is read authoritatively

- **WHEN** the viewed `setData`/`initialize` succeeded and corresponds to the metadata account's current on-chain state
- **THEN** the card SHALL read the metadata account's stored `data_length` and bytes directly
- **AND** SHALL NOT replay the buffer's `write` history at all

#### Scenario: a later instruction changed the payload

- **WHEN** a PMP `setData`, `initialize` or `close` targets the metadata account after the viewed execution position
- **THEN** the live read SHALL be declined and reconstruction SHALL replay the `write` history for the viewed position
- **AND** the current metadata account's `data_length` SHALL NOT be applied to the viewed transaction

#### Scenario: only payload-neutral instructions followed the viewed transaction

- **WHEN** the instructions after the viewed transaction on the metadata account are `trim`, `extend`, `setAuthority`
  or `setImmutable` only
- **THEN** the viewed transaction SHALL still count as the account's current state for payload purposes
- **AND** the live read SHALL NOT be declined because of that unrelated activity

#### Scenario: the metadata account no longer exists

- **WHEN** the live read returns no account, because the metadata account was closed
- **THEN** the live read SHALL be declined and reconstruction SHALL replay the `write` history
- **AND** a missing account SHALL NOT be treated as an empty payload

#### Scenario: the fetched account is a buffer, not a metadata account

- **WHEN** the fetched account's discriminator is not `Metadata`
- **THEN** the live read SHALL be declined
- **AND** the `dataLength` 0 that `getMetadataDecoder()` returns for a Buffer account SHALL NOT be used as a length

#### Scenario: the viewed transaction failed

- **WHEN** the viewed transaction carries `meta.err`
- **THEN** the live-read branch SHALL NOT be taken at all
- **AND** the live account's payload SHALL NOT be attributed to the failed instruction

### Requirement: the reconstructed length MUST be derived from bounds, not from a preferred anchor

Reconstruction MUST derive the payload length from BOUNDS on the account's size at the viewed instruction, and MUST NOT
pick a preferred anchor. The LOWER bounds on that size are the size the genesis System `createAccount` created the
account at, `96 + sum(extend.length)`, and `96 + max(write.offset + chunk.length)` over recoverable writes, the last
because `write` auto-grows the account. A forward size replay in execution order over creation, `allocate`, `extend`
and `write` auto-grow yields the greatest of these, and that value is the REPLAYED SIZE. RPC retention can only make a
lower bound too SMALL, never too large, so none of these is exact and none of them may be labelled EXACT.

The UPPER bound is the account's rent-exempt balance, which is the only observation that can PROVE a length. It is
valid only when some non-zero balance was observed at or AFTER the account reached its final size, because an account
may grow and close inside one transaction with no top-up and a zero post-balance is an allowed rent state. A derived
candidate MUST be confirmed against `getMinimumBalanceForRentExemption` rather than against a hardcoded
lamports-per-byte rate.

Verdicts:

- lower == upper -> the length is PINNED, and the result MAY be reported complete provided coverage has no interior
  gap, no unrecoverable range and no unorderable conflict
- upper > lower, or no upper bound was observed -> nothing pins the length, so the result is BEST-EFFORT ("may be
  truncated"), never complete
- upper < lower -> impossible for a rent-exempt account of that size, so the UPPER BOUND IS DECLINED rather than
  applied, and the result is best-effort

Nothing may shorten the reconstruction below the replayed size: a candidate below it MUST be declined, not applied, and
this decline test applies to EVERY bound, not only the rent bound. The comparison target is the REPLAYED SIZE and not
write coverage, because `extend` grows the account and adds no write coverage, so coverage cannot stand in for it.

This bounds model replaces an earlier one that labelled `createAccount.space` and `96 + sum(extend.length)` EXACT.
`write` auto-grows the account and `getUpdateBufferInstructionPlan` rewrites a live buffer with no `allocate` and no
`close`, so a stale creation size sits at or above the surviving coverage and gets accepted, truncating the payload
while reporting it complete. The `extend` chain additionally undercounts, because the client passes a size DELTA on the
update paths (`updateBuffer.ts:49-56`, `updateMetadata.ts:166-174` and `:234-242` pass `sizeDifference`, not the
payload length) and because kit's realloc packer emits a trailing zero-length `extend` when the total is an exact
multiple of `REALLOC_LIMIT = 10240`, so the chain sums to `totalSize - 10240`.

Reconstruction MUST derive the length itself and report which bounds produced it. It MUST NOT accept a length supplied
by its caller, so that no caller can obtain a "complete" verdict for a reconstruction whose length is not pinned.

#### Scenario: the buffer was created pre-sized

- **WHEN** the buffer's genesis transaction creates the account at its full final size before any `write` lands, and
  `allocate` therefore leaves the size unchanged
- **THEN** that creation size minus the header SHALL be used as a LOWER bound on the payload length
- **AND** it SHALL NOT be treated as exact, so the result SHALL be reported complete only when an upper bound pins the
  same length

#### Scenario: a rewritten buffer's creation size is stale

- **WHEN** a pre-sized buffer is later rewritten with a larger payload through `getUpdateBufferInstructionPlan`, which
  emits neither `allocate` nor `close`, and the rewrite's tail `write` was pruned from RPC history
- **THEN** the stale creation size, sitting at or ABOVE the surviving coverage, SHALL NOT be accepted as the length
- **AND** the result SHALL be best-effort rather than complete, because no upper bound survives to pin it

#### Scenario: a pre-sized buffer is missing a tail write

- **WHEN** a buffer created at its full final size is missing a tail `write` because RPC history was pruned
- **THEN** the replayed size SHALL exceed the range the recovered writes cover and the result SHALL be marked
  incomplete
- **AND** the card SHALL NOT render the shorter payload as complete

#### Scenario: a large payload is missing a tail write

- **WHEN** a payload whose size was reserved by `extend` (larger than the reallocation limit) is missing a tail `write`
- **THEN** the replayed size SHALL exceed the covered writes and the result SHALL be marked incomplete
- **AND** the card SHALL NOT render the shorter payload as complete

#### Scenario: the rent-exempt balance pins the length

- **WHEN** a non-zero balance was observed at or AFTER the account reached its final size and the size it implies
  equals the replayed size
- **THEN** the length SHALL be treated as PINNED and the reconstruction MAY be reported complete, provided coverage has
  no interior gap, no unrecoverable range and no unorderable conflict
- **AND** the bound SHALL be taken from balances already carried by the fetched transactions, and the candidate length
  SHALL be confirmed against `getMinimumBalanceForRentExemption` rather than a hardcoded lamports-per-byte rate

#### Scenario: the rent-exempt balance leaves the length open

- **WHEN** the size implied by the observed balance exceeds the replayed size, whether because the account holds more
  than the rent minimum or because a write is genuinely missing
- **THEN** the result SHALL be labelled best-effort and SHALL NOT be reported complete
- **AND** an upper bound that falls BELOW the replayed size SHALL be declined rather than shrink the reconstruction

#### Scenario: an account grows and closes in one transaction

- **WHEN** the account is grown and closed inside one transaction with no top-up, so the only surviving balance
  observation predates the growth and implies a size BELOW the replayed size
- **THEN** the upper bound SHALL be declined and the result SHALL be best-effort, never complete
- **AND** where the growth also leaves an uncovered range, the stronger verdict incomplete SHALL be reported instead

#### Scenario: `extend` grows the account without adding write coverage

- **WHEN** an `extend` raises the replayed size past the range the recovered writes cover
- **THEN** the uncovered range SHALL be reported as a gap and the result marked incomplete
- **AND** a zero-filled range SHALL NOT be assumed, because a replay cannot tell `extend`'s zero fill from a pruned
  `write`

#### Scenario: the `extend` chain is pruned mid and tail

- **WHEN** RPC retention dropped a middle `extend` and the writes it reserved space for, so every surviving
  observation is internally consistent - lower bound equal to the covered range, no gap
- **THEN** the result SHALL still refuse complete, because the surviving `extend` chain is only a lower bound
- **AND** the rent-implied upper bound exceeding that lower bound SHALL make the result best-effort

#### Scenario: the length cannot be established at all

- **WHEN** a closed-buffer payload is reconstructed for a historical view, the account was created at header size only
  and grown purely by `write` (at or below the reallocation limit, so no `extend` and no pre-sized creation), and every
  observed balance sits above the rent minimum for the replayed size
- **THEN** the card SHALL label the result best-effort ("may be truncated")
- **AND** SHALL NOT assert the reconstruction is authoritative even when the writes appear contiguous

### Requirement: buffer reconstruction MUST be bounded to protect the UI

Reconstruction MUST cap the number of signatures and transactions it fetches and MUST batch the requests, so a
pathological buffer cannot hang the UI or exhaust the RPC endpoint. The bounds are configurable knobs with these
defaults:

- signature history: 1000 per page, at most 10 pages
- concurrent `getTransaction` batch: 25

Both paths MUST carry the total page cap, including the fast path. Pagination MUST page BACKWARDS to the slot bound
rather than trusting a single page, because `getSignaturesForAddress` returns newest-first and pages by signature
(`before`/`until`), not by slot, so for a long-lived metadata PDA one page can contain zero in-scope signatures.
Exhausting the cursor budget MUST be distinguishable from pruned history in the reported state, because the first is a
local limit the user can retry past and the second is not.

#### Scenario: a buffer has more history than the cap

- **WHEN** a buffer's signature history exceeds the configured page cap
- **THEN** fetching SHALL stop at the cap
- **AND** the result SHALL surface "cursor budget exhausted" rather than fetching unbounded pages, distinctly from the
  "history pruned" state

#### Scenario: the first page contains no in-scope signatures

- **WHEN** the newest page of a long-lived metadata PDA's signatures all sit after the viewed execution position
- **THEN** pagination SHALL continue backwards towards the slot bound instead of concluding the history is empty
- **AND** SHALL stop once a page's oldest signature precedes the session's opening boundary

### Requirement: decompressing a reconstructed payload MUST be output-bounded

When a reconstructed buffer payload is compressed (`Gzip`/`Zlib`), decompression MUST enforce a maximum output size
and abort before exhausting memory, because a reconstructed buffer - unlike an inline `data` argument - is not
bounded by the transaction size. The output cap is a configurable knob defaulting to 1 MB, and the decoded render cap
of P1 (256 KB) still applies to what reaches the DOM. On exceeding the bound the card MUST render the raw hex view
plus an oversized-payload affordance instead of the decoded document.

#### Scenario: a reconstructed payload is a decompression bomb

- **WHEN** decompressing the reconstructed bytes would produce output larger than the configured cap
- **THEN** decompression SHALL be aborted before exhausting memory
- **AND** the card SHALL render the raw hex view plus a "payload too large" note with a download affordance

### Requirement: reconstruction MUST be path-independent (fast path and fallback agree)

Buffer reconstruction MUST produce byte-identical results whether it uses the Triton/Helius
`getTransactionsForAddress` fast path (full mode) or the standard `getSignaturesForAddress` + `getTransaction`
fallback, for the same account and viewed execution position, whenever no conflicting overlap sits inside a single
slot. Where one does, only the fast path can order it, so the fallback MUST report the status `ambiguous` instead of
returning bytes that silently disagree with the fast path. Both paths MUST also derive the same length bounds, because
every bound input (the genesis creation size, the `extend` chain, the recovered write coverage and the per-transaction
balances) is available on both. The fallback MUST be used only when the fast path is unavailable (JSON-RPC `-32601`
method-not-found), not to mask other errors.

#### Scenario: the same buffer is reconstructed on both paths

- **WHEN** the same account is reconstructed once via the `getTransactionsForAddress` fast path and once via the
  `getSignaturesForAddress` + `getTransaction` fallback, for the same viewed execution position, and no conflicting
  overlap sits inside a single slot
- **THEN** both SHALL yield byte-identical reconstructed payloads
- **AND** both SHALL apply the same execution-position bound and the same session scoping
- **AND** both SHALL report the same length, the same bounds provenance and the same status

#### Scenario: only the fast path can order a same-slot conflicting overlap

- **WHEN** two writes with different bytes cover an intersecting range in the same slot in different transactions
- **THEN** the fast path SHALL resolve them by `transactionIndex` and MAY report a complete result when the length is
  pinned
- **AND** the fallback SHALL report the status `ambiguous` rather than a differing complete one

#### Scenario: the fast path is unavailable

- **WHEN** `getTransactionsForAddress` returns JSON-RPC `-32601` (method not found)
- **THEN** reconstruction SHALL fall back to the standard `getSignaturesForAddress` + `getTransaction` path
- **AND** any other error SHALL propagate rather than silently triggering the fallback

### Requirement: reconstruction MUST emit a GA analytics event for its own trigger and outcome

Reconstruction MUST emit the shared `trackEvent` (`app/shared/lib/analytics`) event of the P1 analytics requirement for
its own "Decode" trigger with `source` `buffer`, and again when reconstruction settles. P2 owns the extended outcome
vocabulary, which is `decoded` / `incomplete` / `ambiguous` / `best-effort` / `failed`, so the outcome reported here
carries the reconstruction status rather than P1's inline three-value set. The event MUST NOT add its own consent check,
because the shared helper already gates on consent, environment and SSR.

#### Scenario: reconstruction is triggered and settles

- **WHEN** the user triggers "Decode" for a buffer-sourced `setData`/`initialize` and reconstruction settles
- **THEN** one GA event SHALL be emitted for the trigger with `source` `buffer`
- **AND** one GA event SHALL be emitted for the outcome, carrying exactly one of
  `decoded`/`incomplete`/`ambiguous`/`best-effort`/`failed`
