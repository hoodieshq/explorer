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
- **AND** the decoded document SHALL render the same way as the foreign-buffer case

#### Scenario: reconstruction is not automatic

- **WHEN** a buffer-sourced `setData`/`initialize` instruction first renders
- **THEN** the card SHALL NOT fetch anything until the user triggers the "Decode" action

### Requirement: buffer reconstruction MUST be point-in-time scoped to the viewed transaction

Reconstruction MUST include only `write` chunks from the buffer's current session up to the viewed transaction's
slot, so a buffer reused after the viewed transaction cannot attribute later bytes to an earlier `setData`.

#### Scenario: the buffer address was reused after the viewed transaction

- **WHEN** the buffer was closed and re-allocated for a different payload after the viewed transaction's slot
- **THEN** reconstruction SHALL exclude writes from slots after the viewed transaction
- **AND** SHALL exclude writes from a prior session before the most recent `allocate`/`close` that opened this one

#### Scenario: writes are observed out of order

- **WHEN** the `write` transactions are fetched in a non-sequential order
- **THEN** each chunk SHALL be placed at its logical `offset` in a fixed-size buffer
- **AND** the assembled result SHALL be independent of fetch order for non-overlapping writes

### Requirement: incomplete or unavailable reconstruction MUST be surfaced, never shown as complete

The card MUST surface an explicit incomplete or unavailable state when the required `write` history is missing (RPC
history pruned) or does not cover `[0, data_length)`, and MUST NOT present partial bytes as the full decoded
document.

#### Scenario: RPC history is pruned

- **WHEN** `getSignaturesForAddress`/`getTransaction` cannot return the buffer's `write` transactions
- **THEN** the card SHALL show a "reconstruction incomplete, may require archival RPC" state
- **AND** SHALL fall back to the raw view rather than a partial or blank document

#### Scenario: reconstructed writes leave a gap

- **WHEN** the recovered writes do not cover the full `[0, data_length)` range
- **THEN** the card SHALL mark the result incomplete
- **AND** SHALL NOT render the partial bytes as a successfully decoded document

### Requirement: buffer reconstruction MUST be bounded to protect the UI

Reconstruction MUST cap the number of signatures and transactions it fetches and batch the requests, so a
pathological buffer cannot hang the UI or exhaust the RPC endpoint.

#### Scenario: a buffer has more history than the cap

- **WHEN** a buffer's signature history exceeds the configured cap
- **THEN** fetching SHALL stop at the cap
- **AND** the incomplete state SHALL be surfaced rather than fetching unbounded pages

### Requirement: reconstruction MUST be path-independent (fast path and fallback agree)

Buffer reconstruction MUST produce byte-identical results whether it uses the Triton/Helius
`getTransactionsForAddress` fast path (full mode) or the standard `getSignaturesForAddress` + `getTransaction`
fallback, for the same account and viewed slot. The fallback MUST be used only when the fast path is unavailable
(JSON-RPC `-32601` method-not-found), not to mask other errors.

#### Scenario: the same buffer is reconstructed on both paths

- **WHEN** the same account is reconstructed once via the `getTransactionsForAddress` fast path and once via the `getSignaturesForAddress` + `getTransaction` fallback, for the same viewed slot
- **THEN** both SHALL yield byte-identical reconstructed payloads
- **AND** both SHALL apply the same slot bound and session scoping

#### Scenario: the fast path is unavailable

- **WHEN** `getTransactionsForAddress` returns JSON-RPC `-32601` (method not found)
- **THEN** reconstruction SHALL fall back to the standard `getSignaturesForAddress` + `getTransaction` path
- **AND** any other error SHALL propagate rather than silently triggering the fallback
