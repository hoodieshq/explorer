## ADDED Requirements

> Scope: the `External` data source (`ExternalData{address, offset, length}` pointer resolved to a separate
> account) - phase P3 of the `decode-pmp-buffer-content` change. Builds on the `p1-program-metadata-content`
> capability (P1). See `design.md` §5.

### Requirement: External-sourced PMP payloads SHALL be resolved from the referenced account and decoded

The card SHALL resolve a `setData`/`initialize` instruction whose `dataSource` is `External` by decoding the
`ExternalData{address, offset, length}` pointer, fetching the referenced on-chain account, slicing
`[offset, offset+length)` (the whole account from `offset` when `length` is absent, and from byte 0 when `offset` is
absent), decoding the sliced bytes with the instruction's `encoding`/`compression`, and rendering the result per
`format`. Resolution SHALL run only behind an explicit user action, not automatically on render.

#### Scenario: External pointer resolves to an account

- **WHEN** a `setData`/`initialize` instruction has `dataSource = External`
- **AND** the user triggers the "Decode" action
- **THEN** the card SHALL fetch the account at `ExternalData.address`, slice by `offset`/`length`, and render the
  decoded document
- **AND** SHALL show the pointer (`address`, `offset`, `length`) alongside the decoded output

#### Scenario: resolution is not automatic

- **WHEN** an `External` `setData`/`initialize` instruction first renders
- **THEN** the card SHALL NOT fetch the referenced account until the user triggers the "Decode" action
- **AND** SHALL NOT issue any request derived from `ExternalData.address` on render

#### Scenario: length is absent (whole account)

- **WHEN** the encoded `ExternalData.length` field is all zeroes, which the codec decodes as an absent option rather
  than a zero-byte slice
- **THEN** the card SHALL use the account data from `offset` to the end of the account
- **AND** SHALL NOT treat it as an empty payload

#### Scenario: offset is absent (collapsed zero)

- **WHEN** the encoded `offset` is 0, which `unpackExternalData` collapses to an absent option exactly as it does for
  an absent `length`
- **THEN** the card SHALL default the `dataSlice` offset to 0
- **AND** SHALL NOT treat the absent `offset` as a malformed pointer

#### Scenario: the pointer is not exactly 40 bytes

- **WHEN** the payload carrying an `External` pointer is not the 40-byte `ExternalData` layout the program enforces
  on-chain
- **THEN** the card SHALL NOT attempt to decode a pointer from it
- **AND** SHALL show the raw bytes plus an inline "malformed External pointer" note, leaving the account and argument
  tables intact

#### Scenario: encoding/compression apply to the fetched account bytes

- **WHEN** the External payload's `encoding`/`compression` are set
- **THEN** they SHALL be applied to the FETCHED account bytes (the `ExternalData` pointer itself is stored plain)
- **AND** `format` SHALL be applied to the resulting content

#### Scenario: External content is live, not point-in-time

- **WHEN** the External account is fetched
- **THEN** the card SHALL present the content as the account's current state
- **AND** SHALL note that it may differ from what the viewed transaction referenced

#### Scenario: the External Decode action and its outcome are tracked

- **WHEN** the user triggers "Decode" for an `External` payload, and again when resolution settles
- **THEN** a GA event SHALL be emitted per the P1 analytics requirement with `source = external`
- **AND** the settled event SHALL carry an `outcome` from the vocabulary the
  `p2-program-metadata-buffer-reconstruction` capability owns

### Requirement: External resolved length MUST be bounded before fetch and render

The card MUST enforce a maximum resolved length before fetching or rendering an External payload, and on exceeding
it MUST show the pointer plus an oversized-payload affordance instead of the decoded content. The bound MUST be
applied at the RPC by requesting a bounded data slice, not only by discarding an oversized response client-side, so
an oversized account is never transferred in full. The bound MUST be a configurable knob, the External resolved
length cap, defaulting to 256 KB.

#### Scenario: the referenced payload exceeds the cap

- **WHEN** the resolved `length` (or fetched account size) exceeds the External resolved length cap (default 256 KB)
- **THEN** the card SHALL NOT render the full decoded content
- **AND** SHALL show the pointer and a "payload too large" note with a download affordance

#### Scenario: the account is fetched with a bounded slice

- **WHEN** the External account is fetched
- **THEN** the request SHALL ask for at most the capped byte range starting at `offset`
- **AND** a response filling that whole range SHALL be treated as exceeding the cap

### Requirement: a missing or unreadable External account MUST degrade gracefully

The card MUST degrade gracefully when the referenced External account does not exist or cannot be fetched, showing
the pointer and an explicit unavailable state rather than blanking or throwing the card.

#### Scenario: the referenced account does not exist

- **WHEN** fetching `ExternalData.address` returns no account
- **THEN** the card SHALL show the `ExternalData` pointer and a "referenced account unavailable" note
- **AND** the instruction's account and argument tables SHALL still render

### Requirement: decompressing a fetched External payload MUST be output-bounded

When an External payload is compressed (`Gzip`/`Zlib`), decompression of the fetched account bytes MUST enforce a
maximum output size and abort before exhausting memory. The resolved-length bound caps the compressed INPUT only,
not the decompressed OUTPUT, so both bounds apply. The output bound MUST be a configurable knob, the bounded
inflate output cap, defaulting to 1 MB. On exceeding the output bound the card MUST show the pointer plus an
oversized-payload affordance instead of the decoded content.

#### Scenario: a fetched External payload is a decompression bomb

- **WHEN** decompressing the fetched account bytes would produce output larger than the bounded inflate output cap
  (default 1 MB)
- **THEN** decompression SHALL be aborted before exhausting memory
- **AND** the card SHALL show the `ExternalData` pointer plus a "payload too large" note with a download affordance
