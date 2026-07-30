## ADDED Requirements

> Scope: the `Url` data source (the on-chain bytes decode to a URL whose content is then fetched and rendered) -
> phase P4 of the `decode-pmp-buffer-content` change. Builds on the `p1-program-metadata-content` capability (P1).
> See `design.md` §5. Reuses the repo's external-link hardening (`getSafeExternalHref`) for the displayed source
> link, and may route the fetch through the existing server-side metadata proxy (`app/api/metadata/proxy`) to
> bypass CORS and centralize SSRF/size controls.

### Requirement: Url-sourced PMP payloads SHALL be fetched and rendered as content

The card SHALL decode a `setData`/`initialize` instruction whose `dataSource` is `Url` to its URL string (applying
`encoding`/`compression` to the on-chain pointer bytes), fetch that URL behind an explicit user action, and render
the fetched content per `format` (JSON pretty-printed, other formats verbatim). The source URL SHALL always be
shown alongside the result.

#### Scenario: a Url payload is decoded and its content fetched

- **WHEN** a `setData`/`initialize` instruction has `dataSource = Url`
- **AND** the user triggers the "Decode" action
- **THEN** the card SHALL decode the on-chain bytes to the URL, fetch it, and render the returned content per `format`
- **AND** SHALL show the source URL alongside the rendered content

#### Scenario: encoding/compression apply to the pointer, format to the fetched body

- **WHEN** the `Url` payload's `encoding`/`compression` are set
- **THEN** they SHALL be applied to decode the on-chain bytes into the URL string
- **AND** `format` SHALL be applied to the FETCHED content, not to the URL pointer

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

### Requirement: Url fetch MUST be bounded and fail gracefully

Url fetching MUST be capped in response size and bounded by a timeout, and any fetch failure (including CORS, a
network error, or a non-success status) MUST surface as an error state that still shows the source URL, never a
blank or a thrown card.

#### Scenario: the fetch is blocked or fails

- **WHEN** fetching the URL fails due to CORS, a network error, or a non-2xx status
- **THEN** the card SHALL show the source URL plus an inline "content could not be fetched" note
- **AND** the instruction's account and argument tables SHALL still render

#### Scenario: the response exceeds the size cap or the timeout

- **WHEN** the fetched response exceeds the configured size cap or does not complete within the timeout
- **THEN** the fetch SHALL be aborted
- **AND** the card SHALL show the source URL plus a "content too large or timed out" note
