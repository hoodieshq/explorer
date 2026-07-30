## ADDED Requirements

> Scope: the `External` data source (`ExternalData{address, offset, length}` pointer resolved to a separate
> account) - phase P3 of the `decode-pmp-buffer-content` change. Builds on the `p1-program-metadata-content`
> capability (P1). See `design.md` §5.

### Requirement: External-sourced PMP payloads SHALL be resolved from the referenced account and decoded

The card SHALL resolve a `setData`/`initialize` instruction whose `dataSource` is `External` by decoding the
`ExternalData{address, offset, length}` pointer, fetching the referenced on-chain account, slicing
`[offset, offset+length)` (the whole account from `offset` when `length` is 0), decoding the sliced bytes with the
instruction's `encoding`/`compression`, and rendering the result per `format`. Resolution SHALL run only behind an
explicit user action.

#### Scenario: External pointer resolves to an account

- **WHEN** a `setData`/`initialize` instruction has `dataSource = External`
- **AND** the user triggers the "Decode" action
- **THEN** the card SHALL fetch the account at `ExternalData.address`, slice by `offset`/`length`, and render the decoded document
- **AND** SHALL show the pointer (`address`, `offset`, `length`) alongside the decoded output

#### Scenario: length is zero (whole account)

- **WHEN** the `ExternalData.length` is 0
- **THEN** the card SHALL use the account data from `offset` to the end of the account

#### Scenario: encoding/compression apply to the fetched account bytes

- **WHEN** the External payload's `encoding`/`compression` are set
- **THEN** they SHALL be applied to the FETCHED account bytes (the `ExternalData` pointer itself is stored plain)
- **AND** `format` SHALL be applied to the resulting content

#### Scenario: External content is live, not point-in-time

- **WHEN** the External account is fetched
- **THEN** the card SHALL present the content as the account's current state
- **AND** SHALL note that it may differ from what the viewed transaction referenced

### Requirement: External resolved length MUST be bounded before fetch and render

The card MUST enforce a maximum resolved length before fetching or rendering an External payload, and on exceeding
it MUST show the pointer plus an oversized-payload affordance instead of the decoded content.

#### Scenario: the referenced payload exceeds the cap

- **WHEN** the resolved `length` (or fetched account size) exceeds the configured cap
- **THEN** the card SHALL NOT render the full decoded content
- **AND** SHALL show the pointer and a "payload too large" note with a download affordance

### Requirement: a missing or unreadable External account MUST degrade gracefully

The card MUST degrade gracefully when the referenced External account does not exist or cannot be fetched, showing
the pointer and an explicit unavailable state rather than blanking or throwing the card.

#### Scenario: the referenced account does not exist

- **WHEN** fetching `ExternalData.address` returns no account
- **THEN** the card SHALL show the `ExternalData` pointer and a "referenced account unavailable" note
- **AND** the instruction's account and argument tables SHALL still render
