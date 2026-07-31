## ADDED Requirements

> Scope: P1 (Direct-inline) behavior plus the cross-cutting guards (local error fallback, bounded decompression)
> and the analytics event. P2/P3/P4 requirements live in sibling capabilities
> `p2-program-metadata-buffer-reconstruction`, `p3-program-metadata-external-source`, and
> `p4-program-metadata-url-source`; implementation still lands per phase - see `design.md`.

### Requirement: Direct inline (Direct) PMP payloads provided by ix data argument SHALL be decoded and rendered as content

The instruction card SHALL decode the inline `data` of a `setData` or `initialize` instruction whose `dataSource`
is `Direct`, applying the on-chain `encoding` and `compression`, and render the decoded document alongside the raw
bytes. The decode config (`encoding`, `compression`, `format`, `dataSource`, `data`) MUST be read by decoding the
raw instruction bytes with the library's typed decoders, not by mapping Codama-parsed argument strings.

#### Scenario: `setData` carries an inline Direct JSON document

- **WHEN** a `setData` instruction has non-empty inline `data`, `dataSource = Direct`, and `format = Json`
- **THEN** the card SHALL render a "decoded" section/tab showing the pretty-printed JSON
- **AND** SHALL also show the raw encoded bytes (hex/base64) alongside the decoded output

#### Scenario: payload is compressed (done by unpackDirectData, uncompressData, unpackAndFetchData)

- **WHEN** the instruction's `compression` is `Gzip` or `Zlib`
- **THEN** the payload SHALL be decompressed before decoding
- **AND** the decoded string SHALL be rendered (JSON pretty-printed, other formats verbatim)

#### Scenario: encoding is None

- **WHEN** the instruction's `encoding` is `None`
- **THEN** the payload SHALL be rendered as hex, not as text

### Requirement: `write` instructions SHALL display the carried chunk without reconstruction

A `write` instruction SHALL display its `offset` and the raw chunk it carries, and SHALL NOT attempt full-buffer
reconstruction or cross-transaction decode on the instruction page.

#### Scenario: `write` carries an inline chunk

- **WHEN** a `write` instruction has non-empty inline `data`
- **THEN** the card SHALL show the `offset` and the raw chunk bytes (hex/base64)
- **AND** SHALL NOT render a decoded document for it

#### Scenario: `write` copies from a source buffer

- **WHEN** a `write` instruction has empty `data` and a `sourceBuffer` account (index 2) set
- **THEN** the card SHALL show the `sourceBuffer` address and a note that the chunk is not in this instruction
- **AND** SHALL NOT reconstruct the source buffer

### Requirement: decode failures MUST fall back locally without discarding the parsed instruction

A decode failure MUST fall back to the raw hex view within the Decoded Content section, and MUST NOT propagate to
the card-level error boundary that would replace the whole card with the Unknown fallback.

#### Scenario: payload bytes fail to decode

- **WHEN** decoding throws (bad bytes, wrong compression, or truncated data)
- **THEN** the Decoded Content section/tab SHALL render the raw hex view plus an inline error note
- **AND** the instruction's account table and argument table SHALL still render unchanged

### Requirement: compressed payloads MUST be decompressed under a hard size bound

Decompression of an on-chain payload MUST enforce a maximum output size, and on exceeding it MUST render the raw
hex view plus an oversized-payload affordance instead of the decoded content.

#### Scenario: a decompression bomb exceeds the cap

- **WHEN** decompressing a payload would produce output larger than the configured cap
- **THEN** decompression SHALL be aborted before exhausting memory
- **AND** the section SHALL render the raw hex view plus a "payload too large" note with a download affordance

### Requirement: decoding PMP buffer content MUST emit a GA analytics event

Decoding PMP buffer content MUST emit a Google Analytics event through the shared `trackEvent`
(`app/shared/lib/analytics`) when the user triggers the "Decode" action and when a payload is decoded, so feature
usage is measurable. The event MUST fire client-side only, MUST distinguish reconstructed/fetched sources from
inline decoding, and MUST NOT add its own consent check (the shared helper and the GA slot already gate on
consent, environment, and SSR).

#### Scenario: the user triggers the Decode action

- **WHEN** the user clicks "Decode" for a buffer, External, or Url payload
- **THEN** a GA event SHALL be emitted identifying the `instruction` and the `source` (`buffer`/`external`/`url`)

#### Scenario: a payload is decoded

- **WHEN** decoding, reconstruction, or fetch resolves
- **THEN** a GA event SHALL be emitted carrying the `outcome` (`decoded`/`incomplete`/`failed`) and the `source`
- **AND** the `source` SHALL let `inline` decoding be told apart from `buffer`/`external`/`url`

#### Scenario: analytics is unavailable

- **WHEN** the card renders on the server, without analytics consent, or with no measurement id configured
- **THEN** no event SHALL be emitted
- **AND** no error SHALL be thrown or surfaced to the user
