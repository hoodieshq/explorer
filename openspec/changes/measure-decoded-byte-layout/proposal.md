# Proposal: Measure the byte layout of a decoded payload instead of computing it

## Context

`HOO-841` proposes a Solrengine-Bytes-style byte inspector on the Account page; its spike `HOO-1076`
asks whether the "account bytes → human-readable" core can be wrapped as a usable package, naming two
applications — a Raw Data widget that explains the data structure, and an MCP endpoint that explains
the data layout.

The core is already wrapped. `@explorer/idl-decode` decodes account and instruction data from Anchor,
legacy Anchor and Codama IDLs through one pipeline, and `@explorer/entity-inspector` already
IDL-decodes unknown accounts for the `inspect_entity` MCP tool. One capability is missing, and both
applications need exactly it: **byte offsets**. `client.decodeAccount()` returns the payload plus the
matched `AccountNode`; `@codama/dynamic-parsers` never reports where a field sat. Without offsets you
cannot highlight a hex dump or describe a layout.

## Why

Two ways to obtain the ranges:

- **Compute them** — walk the schema top-down (as `getDecodedEntries` already does) and sum each
  node's size, from `getByteSizeVisitor` when fixed and from the codec when not. Rejected: it is a
  second implementation of every size rule Codama already owns — length prefixes, size prefixes,
  sentinels, pre/post offsets, hidden prefixes, fixed vs. remainder options, zeroable options. Those
  rules are precisely the layouts a byte inspector exists to explain, so the one place a divergence
  would appear is the place correctness matters most, and a wrong offset is worse than no offset.
- **Measure them** — instrument the codec pipeline (`interceptVisitor` over
  `@codama/dynamic-codecs`' node codec visitor) so every node's `read` records the span it consumed,
  then read the payload once. Adopted: a range is what the decoder did, by construction. Verified
  against published layouts — the SPL Token account reproduces `mint@0`, `owner@32`, `amount@64`,
  `delegate@72+36`, `state@108`, `isNative@109+12`, `delegatedAmount@121`, `closeAuthority@129+36`,
  and `let_me_buy`'s `Vec<Receipt>` (legacy Anchor, variable size, nested `String`) resolves element
  by element.

Also considered and rejected:

- **A separate package.** `@explorer/idl-decode` already owns the root, the linkables and the client
  surface, and both consumers already depend on it. AGENTS.md: start with the simplest thing that works.
- **A `./layout` subpath.** The package's own criterion is that an entry earns its keep only when it
  guards a dependency subtree some consumer profile must never load. `@codama/dynamic-parsers` pulls
  `@codama/dynamic-codecs` in from the main entry regardless, so `./layout` would guard nothing.
- **An entry per codec read.** Faithful but unusable: an unnamed twin under every non-scalar field,
  and a `[Tick; 60]` account becomes ~2000 rows the schema never named (measured: 1996 reads on
  amm_v3's 10 240-byte `TickArrayState`). Entries name fields and containers instead.
- **An error-first `Result`.** Rejected for consistency with its sibling `getDecodedEntries`, which
  throws a typed `IdlError`. The package's convention is `try*` for Result-returning routes; a bare
  name throws.

## What Changes

- **`getDecodedLayout(decode, data)`** in `@explorer/idl-decode` (main entry, beside
  `getDecodedEntries`) returns a `LayoutEntry` tree: `path`, `name`, resolved `node`, `docs`,
  `offset`, `size`, `value`, `children`. `flattenLayout` walks it depth-first. Accounts and
  instructions both, since the instruction node decodes through a synthesized argument struct.
- **Framing never earns an entry.** Where the framed member has an entry, a length prefix, an enum
  discriminant or an option tag appears as unclaimed bytes between a parent's range and its children's.
  Where it does not — a size-prefixed string, an option of a scalar, a scalar enum — the framing stays
  inside the entry's own range, so `size` is the field's extent rather than its payload's. Non-container
  array elements stay values on their array — a variant-only enum among them, split from a data enum by
  the engine's own `isScalarEnum` — while struct elements get their own entry.
- **Containment comes from read nesting.** Each instrumented `read` claims the reads made inside its own
  call. Comparing byte ranges instead cannot separate a zero-size sibling from a child, and it loses the
  read positions that keep an element's index the payload's own.
- **A path addresses the payload.** Reading an entry's path out of the decode yields that entry's value:
  element indices are the payload's, map keys are the payload's, and an option's payload sits under
  `value`. This diverges from `getDecodedEntries`, which unwraps options transparently.
- **The IDL's docs ride along.** Codama carries `structFieldTypeNode.docs`, so the program's own Rust
  doc comments reach the entry — the "explain it" text needs no separate source.
- **New error code `IDL_ERROR__LAYOUT_WALK_FAILED` (12)** for bytes the decode cannot be replayed
  against, and **`IDL_ERROR__LAYOUT_NOT_ANCHORABLE` (13)** for a healthy decode the walk cannot describe
  — a payload read through no container at all. One code for both would blame the caller's bytes for a
  schema's shape. A non-codama arm throws the existing `IDL_ERROR__DECODE_KIND_MISMATCH`.
- **`@codama/dynamic-codecs` moves from `devDependencies` to `dependencies`** — it is now a runtime
  import, and pnpm's strict layout would not resolve it transitively for a consumer.

**Out of scope:** the MCP tool wiring, and the Account-page UI (`AnchorAccountCard`'s Borsh path, the
hex viewer's per-range colouring). Both consume this and land separately.

## Impact

- **Files:** new `packages/idl-decode/src/layout/` plus its two specs; `src/index.ts`, `src/errors.ts`,
  `package.json`, `README.md`, `DESIGN.md` touched. No existing behaviour changes.
- **Accepted risk:** the walk depends on `@codama/dynamic-codecs`' codec-visitor internals
  (`getNodeCodecVisitor`, `NodeStack`, `interceptVisitor`). Public API, but low-level — a Codama major
  could move it. The real-IDL specs are the tripwire; published SPL Token offsets are the oracle.
- **Cost:** one extra read pass over the bytes. Measured on amm_v3's 10 240-byte `TickArrayState`:
  ~5 ms instrumented vs. ~0.7 ms plain, bounded by payload size, never on a hot loop.
- **Docs:** `README.md` gains a "Byte layout" section; `DESIGN.md` records the measure-not-compute
  decision, the field-not-framing entry vocabulary, and why layout rides the main entry.
