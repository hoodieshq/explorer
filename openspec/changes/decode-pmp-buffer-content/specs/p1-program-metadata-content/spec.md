## ADDED Requirements

> Scope: P1 (Direct-inline) behavior plus the cross-cutting guards (local error fallback, render-size cap) and the
> inline analytics event. The unbounded-inflate (decompression-bomb) guard lives in P2/P3, where buffer-sourced/fetched
> bytes are not transaction-size bounded. P2/P3/P4 requirements live in sibling capabilities
> `p2-program-metadata-buffer-reconstruction`, `p3-program-metadata-external-source`, and
> `p4-program-metadata-url-source`. Implementation still lands per phase - see `design.md`.

### Requirement: inline (Direct) PMP payloads carried by the ix data argument SHALL be decoded and rendered

Where the instruction card renders a decoded PMP `setData` or `initialize`, the card SHALL decode the inline `data`
when `dataSource` is `Direct`, applying the on-chain `encoding` and `compression`, and render the decoded document
alongside the raw bytes. The decode config (`encoding`, `compression`, `format`, `dataSource`, `data`) MUST be read by
decoding the raw instruction bytes with the library's typed decoders, not by mapping Codama-parsed argument strings.
Because `setData` carries `dataSource` as an optional trailing byte that the typed decoder requires, the config decode
MUST branch on the instruction data length before invoking that decoder.

Two limits of the chosen integration point are not resolved by this requirement, and both depend on the open decision
in `design.md` section 7:

- a 4-byte header-only `setData` never reaches a decoded card at all, because the Codama dynamic parser throws on the
  missing mandatory `dataSource` field and the card falls through to the Unknown fallback, so the length branch above
  cannot run there and the header-only scenario below is only reachable once that decision lands
- the card path is gated on runtime PMP IDL resolution, while P1 needs no IDL, since the typed decoders ship in the
  installed package, so an IDL-free decode also depends on that decision

#### Scenario: `setData` carries an inline Direct JSON document

- **WHEN** a `setData` instruction has non-empty inline `data`, `dataSource = Direct`, and `format = Json`
- **THEN** the card SHALL render a "decoded" section/tab showing the pretty-printed JSON
- **AND** SHALL also show the raw encoded bytes (hex/base64) alongside the decoded output

#### Scenario: an inline payload is compressed

- **WHEN** the instruction's `compression` is `Gzip` or `Zlib`
- **THEN** the inline payload (transaction-size bounded) SHALL be decompressed before decoding
- **AND** the decoded string SHALL be rendered (JSON pretty-printed, other formats verbatim)

#### Scenario: encoding is None

- **WHEN** the instruction's `encoding` is `None`
- **THEN** the payload SHALL be rendered as hex, not as text

#### Scenario: `setData` carries only the header hints

- **WHEN** a `setData` instruction's data is 4 bytes (`discriminator`, `encoding`, `compression`, `format`), the
  header-only shape that carries neither `dataSource` nor a payload
- **THEN** the card SHALL render the updated hints and state that this instruction carries no new payload
- **AND** SHALL NOT surface a decode failure, since the typed `setData` decoder cannot decode that shape

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

### Requirement: rendered decoded content MUST be size-capped

The decoded content rendered into the card MUST be bounded by the configurable render cap
`PMP_DECODED_RENDER_CAP_BYTES` (default 256 KB), and on exceeding it MUST render a bounded preview instead of the full
decoded document. The preview is the first `PMP_DECODED_RENDER_CAP_BYTES` bytes as hex, the payload's total byte count,
and a download affordance for the full bytes. `HexData` cannot serve as that fallback on its own, because at
`truncate: false` it renders every byte, which is the cost being avoided, and at `truncate: true` it shows only 8 head
plus 8 tail bytes, which is not a usable view of the payload. Inline Direct payloads are already transaction-size
bounded, so P1 needs no decompression-output bound - the unbounded-inflate guard lives in P2/P3, where buffer-sourced
or fetched bytes are not transaction-bounded.

#### Scenario: decoded content exceeds the render cap

- **WHEN** the decoded document is larger than `PMP_DECODED_RENDER_CAP_BYTES`
- **THEN** the card SHALL NOT render the full decoded content
- **AND** SHALL render a hex view of the first `PMP_DECODED_RENDER_CAP_BYTES` bytes, the payload's total byte count,
  and a "payload too large" note with a download affordance for the full bytes

### Requirement: decoding an inline PMP payload MUST emit a GA analytics event

Decoding an inline PMP payload MUST emit a Google Analytics event through the shared `trackEvent`
(`app/shared/lib/analytics`) so feature usage is measurable. The event MUST fire client-side only, MUST carry
`source = inline` so inline decoding can be told apart from the `buffer`/`external`/`url` sources that P2/P3/P4 add,
and MUST NOT add its own consent check (the shared helper and the GA slot already gate on consent, environment, and
SSR). P1 has no "Decode" action, that trigger first exists in P2, so P1 emits on the inline decode only. P2, P3 and P4
each own the event for their own Decode trigger and outcome, and P2 owns the outcome vocabulary.

#### Scenario: an inline payload is decoded

- **WHEN** an inline Direct payload decodes on the instruction card
- **THEN** a GA event SHALL be emitted identifying the `instruction` and carrying `source = inline`
- **AND** the event's `outcome` SHALL be `decoded`, or `failed` when the local decode fallback is taken

#### Scenario: analytics is unavailable

- **WHEN** the card renders on the server, without analytics consent, or with no measurement id configured
- **THEN** no event SHALL be emitted
- **AND** no error SHALL be thrown or surfaced to the user
