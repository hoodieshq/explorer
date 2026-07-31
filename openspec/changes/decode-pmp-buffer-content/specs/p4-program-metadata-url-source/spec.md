## ADDED Requirements

> Scope: the `Url` data source (the on-chain bytes decode to a URL whose content is then fetched and rendered) -
> phase P4 of the `decode-pmp-buffer-content` change. Builds on the `p1-program-metadata-content` capability (P1).
> See `design.md` §5. Reuses the repo's external-link hardening (`getSafeExternalHref`) for the displayed source
> link, and routes the fetch through a NEW content-agnostic passthrough route that preserves bytes. The existing
> metadata proxy (`app/api/metadata/proxy`) cannot serve P4: it accepts only `application/json`, `text/plain` that
> parses as JSON, and `image/*` and 415s everything else, it re-serializes JSON bodies so the raw fetched bytes
> never reach the client, and it 404s unless `NEXT_PUBLIC_METADATA_ENABLED` is `'true'`, which ships `false` in both
> `.env` and `.env.example`.

### Requirement: Url-sourced PMP payloads SHALL be fetched and rendered as content

The card SHALL decode a `setData`/`initialize` instruction whose `dataSource` is `Url` to its URL string (applying
`encoding`/`compression` to the on-chain pointer bytes), fetch that URL behind an explicit user action, and render
the fetched content per `format` (JSON pretty-printed, other formats such as YAML, TOML and plain text verbatim).
The source URL SHALL always be shown alongside the result.

#### Scenario: a Url payload is decoded and its content fetched

- **WHEN** a `setData`/`initialize` instruction has `dataSource = Url`
- **AND** the user triggers the "Decode" action
- **THEN** the card SHALL decode the on-chain bytes to the URL, fetch it, and render the returned content per `format`
- **AND** SHALL show the source URL alongside the rendered content

#### Scenario: fetching is not automatic

- **WHEN** a `Url` `setData`/`initialize` instruction first renders
- **THEN** the card SHALL NOT fetch the decoded URL until the user triggers the "Decode" action
- **AND** SHALL NOT issue any request derived from that URL on render, so rendering the card is never an outbound beacon

#### Scenario: encoding/compression apply to the pointer, format to the fetched body

- **WHEN** the `Url` payload's `encoding`/`compression` are set
- **THEN** they SHALL be applied to decode the on-chain bytes into the URL string
- **AND** `format` SHALL be applied to the FETCHED content, not to the URL pointer

#### Scenario: the Url Decode action and its outcome are tracked

- **WHEN** the user triggers "Decode" for a `Url` payload, and again when the fetch settles
- **THEN** a GA event SHALL be emitted per the P1 analytics requirement with `source = url`
- **AND** the settled event SHALL carry an `outcome` from the vocabulary the
  `p2-program-metadata-buffer-reconstruction` capability owns

### Requirement: the source URL SHALL be scheme-safe and only http(s) URLs SHALL be fetched

The card SHALL render the decoded URL as a link only when it is an absolute `http:`/`https:` URL (opened with
`rel="noopener noreferrer"`), and SHALL fetch only `http:`/`https:` URLs. A value with any other scheme MUST render
as plain text and MUST NOT be fetched.

#### Scenario: the decoded value is an https URL

- **WHEN** the decoded `Url` value is an absolute `https:` URL
- **THEN** the card SHALL render it as an external link with `rel="noopener noreferrer"`
- **AND** SHALL fetch its content when the user triggers the "Decode" action

#### Scenario: the decoded value carries an unsafe scheme

- **WHEN** the decoded value uses a `javascript:`, `data:`, `file:`, or other non-`http(s)` scheme
- **THEN** the card SHALL render the value as plain text
- **AND** SHALL NOT render an anchor targeting it or fetch it

### Requirement: Url fetches MUST route through a content-agnostic passthrough route

Url fetches MUST route through a server-side passthrough route that is content-agnostic and byte-preserving, so a
YAML, TOML or plain-text document reaches the client exactly as served while CORS, SSRF and size controls stay on
the server. The existing metadata proxy (`app/api/metadata/proxy`) MUST NOT be reused: its content-type allowlist
415s anything outside JSON and `image/*`, it re-serializes JSON bodies so the client never sees the fetched bytes,
and it is disabled unless `NEXT_PUBLIC_METADATA_ENABLED` is `'true'`. P4 therefore ships its own route, and the
route's enablement flag and its default state MUST be an explicit, documented decision rather than an inherited
assumption.

#### Scenario: a non-JSON document is served verbatim

- **WHEN** the fetched URL returns YAML, TOML, or plain text that is not valid JSON
- **THEN** the passthrough route SHALL return the response bytes unmodified, without re-serialization or a
  content-type allowlist rejection
- **AND** the card SHALL render that content verbatim per `format`

#### Scenario: the passthrough route is disabled

- **WHEN** the passthrough route is disabled by its enablement flag
- **THEN** the card SHALL show the source URL plus an inline "content fetching is disabled" note
- **AND** SHALL NOT fall back to a direct browser fetch of the URL

### Requirement: Url fetch MUST be bounded and fail gracefully

Url fetching MUST be capped in response size and bounded by a timeout, and any fetch failure (including CORS, a
network error, or a non-success status) MUST surface as an error state that still shows the source URL, never a
blank or a thrown card. Both bounds are P4's own configurable knobs, the Url response cap defaulting to 4 MB and
the Url fetch timeout defaulting to 10 s, matching the bounds the existing metadata proxy already enforces
(`NEXT_PUBLIC_METADATA_MAX_CONTENT_SIZE` 4 MB, `NEXT_PUBLIC_METADATA_TIMEOUT` 10 s).

#### Scenario: the fetch is blocked or fails

- **WHEN** fetching the URL fails due to CORS, a network error, or a non-2xx status
- **THEN** the card SHALL show the source URL plus an inline "content could not be fetched" note
- **AND** the instruction's account and argument tables SHALL still render

#### Scenario: the response exceeds the size cap or the timeout

- **WHEN** the fetched response exceeds the Url response cap (default 4 MB) or does not complete within the Url fetch
  timeout (default 10 s)
- **THEN** the fetch SHALL be aborted
- **AND** the card SHALL show the source URL plus a "content too large or timed out" note
