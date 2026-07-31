# Proposal: Decode PMP buffer content on the instruction page

## Context

- The explorer already decodes Program Metadata Program (PMP, `ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S`)
  instructions into accounts and args via the Codama dynamic-parser path (`useIdlInstructionDecode` ->
  `CodamaInstructionCard`). This works only because PMP self-publishes an on-chain IDL that `useProgramIdls`
  resolves at runtime - there is no bundled/registered PMP decoder in app runtime.
- What is NOT decoded is the metadata PAYLOAD (bufferData) that a PMP instruction carries. `setData` and
  `initialize` carry `encoding + compression + format + dataSource + data`, describing a JSON/YAML/TOML/text
  document. Today the card renders `data` as an opaque byte array (`Array[N]`), so a reader cannot see WHAT
  metadata the transaction wrote.
- Linear ticket [HOO-943](https://linear.app/solana-fndn/issue/HOO-943/parse-program-metadata-program-buffer-accounts-in-inspector). [Draft PR#90](https://github.com/hoodieshq/explorer/pull/90) with mvp experimental implementation of pmp history.
- The full decode toolkit already ships as a dependency (`@solana-program/program-metadata@0.7.0` +
  `pako@2.1.0`). The gap is wiring: sourcing the bytes (inline arg vs a buffer account vs an external account),
  decoding them, and rendering the result.

## Why

A user inspecting a PMP transaction wants to see the metadata document it wrote, not a byte blob. The decode
primitives exist - the work is honest byte-sourcing plus careful rendering. The decisions a reviewer could
question are captured below with the alternative that was weighed.

- **How to read the decode hints - re-decode raw ix bytes (chosen) vs map Codama-parsed args.** The Codama
  dynamic parser emits the scalar enums (`encoding`/`compression`/`format`/`dataSource`) as plain variant
  STRINGS (`'Base64'`), not `{__kind:'Base64'}`, and `data` as an `Option`. Mapping those strings back to the
  library's numeric enums is brittle and version-coupled. Re-decoding the raw instruction bytes
  (`ix.data`, available at the card) with the library's typed
  `getSetDataInstructionDataDecoder`/`getInitializeInstructionDataDecoder` yields numeric enums plus a typed
  `Option<bytes>` directly. Chosen: typed decoders.
- **Where the bytes come from - branch on inline vs buffer.** `data` present means inline (0 RPC, exactly
  point-in-time correct). `data` empty means the bytes live in a referenced buffer account (`setData`) or the
  metadata PDA itself (`initialize` in-place), which must be reconstructed.
- **Reconstruction technique - write-replay (chosen) vs live account read.** A live `getAccountInfo` is cheap
  but gives the account's CURRENT state (wrong for a historical tx if it was later updated) and returns `null`
  for a foreign buffer, because the client closes that buffer right after `setData` to reclaim rent. Replaying
  the `write` history bounded by the viewed slot is the point-in-time-correct method and the only option for a
  closed buffer.
- **Reconstruction assembly - offset-patch (chosen) vs sequential append.** `getSignaturesForAddress` has no
  intra-slot index, so a strict oldest-first replay is non-deterministic within a slot. Patching each `write`
  chunk into a fixed-size buffer at its logical `offset` is order-independent for non-overlapping writes and
  sidesteps the ambiguity.
- **Reconstruction helper - build fresh (chosen) vs reuse.** [`@solana/idl`](https://github.com/solana-foundation/idl) `reconstructBufferData` is internal
  and not slot-scoped. [PR #90's]((https://github.com/hoodieshq/explorer/pull/90)) `replayBufferWrites` is not in this checkout. A fresh ~40-60 line helper using
  the existing `Connection` is small, self-contained, and swappable for a shared one later.
- **Integration point - OPEN.** Extend the shared `CodamaInstructionCard` vs a dedicated program-id-keyed PMP
  card with pure helpers in an entity/`shared/lib`. Leaning toward keeping the generic card PMP-free, but the FSD
  placement and the UI are undecided and resolved at planning time.

## What Changes

Delivered as an ordered set of independently shippable phases (P1-P4, detailed in `design.md`). All four
content paths are in scope - the ordering isolates risk, it is not a scope cut.

- **P1 - Direct inline (0 RPC, no new deps).** Decode `setData`/`initialize` inline `data` (`dataSource=Direct`)
  via the typed decoders + `unpackDirectData`, and render the encoded (raw) bytes and decoded document side by
  side. Show the `write` chunk raw. JSON pretty-print (size-capped), YAML/TOML/text verbatim, Encoding None as
  hex. Security guards land here, not later: bounded decompression, max render size, and a LOCAL decode-error
  fallback to `HexData`.
- **P2 - Buffer reconstruction (behind a "Decode" button).** Slot-scoped write-replay for `setData`
  foreign-buffer and `initialize` in-place, via a new SWR hook that reads the cluster url from `useCluster()`,
  builds a `Connection`, and pages `getSignaturesForAddress` + `getTransaction` (raw). Offset-patched assembly,
  with an explicit "reconstruction incomplete" state when writes are uncovered or RPC history is pruned.
- **P3 - External data source.** Resolve the `ExternalData{address, offset, length}` pointer, fetch the referenced
  account (bounded), slice, decode, and render per `format`, on the same RPC stack chosen for P2. The fetched
  content is live/current-state, not point-in-time.
- **P4 - Url data source.** Decode the on-chain bytes to a URL, show it as a scheme-safe link, and fetch + render
  its content per `format` behind the Decode action, guarded (http(s)-only, size cap, timeout, graceful
  CORS/failure). Client-side cross-origin fetches are often CORS-blocked, so route through the repo's existing
  server-side metadata proxy (`app/api/metadata/proxy`) when needed.
- **New units.** Pure `decodePmpPayload(bytes, config) -> string` and `reconstructBuffer(writes, dataLength) ->
  bytes` helpers (RPC-free, unit-testable), a new SWR fetch hook, and a "Decoded Content" UI section. Their FSD
  placement is OPEN (see `design.md`).
- **Analytics (GA).** Fire a Google Analytics event via the shared `trackEvent` (`app/shared/lib/analytics`) when
  the user triggers Decode (`pmp_decode_clicked`) and when it resolves (`pmp_decode_completed`, with `instruction`
  / `source` / `format` / `outcome`), following the interactive-IDL feature-local analytics pattern. The `source`
  param distinguishes reconstructed/fetched from just-parsed. This is how we measure whether the feature is used.
  No new deps - reuses the existing consent-gated GA wiring.

The `specs/` deltas cover all four phases, one capability each: `p1-program-metadata-content` (P1),
`p2-program-metadata-buffer-reconstruction` (P2), `p3-program-metadata-external-source` (P3), and
`p4-program-metadata-url-source` (P4). Implementation still lands phase by phase. Deferred to planning (this change
captures rationale + technical shape, not a task breakdown): `tasks.md`, the FSD placement, the UI layout, and
the single-RPC-stack choice.

## Impact

- **No new dependencies.** `@solana-program/program-metadata@0.7.0`, `pako@2.1.0`, `@microlink/react-json-view`,
  `@solana/kit@6.5.0`, and `@solana/web3.js@1.98.4` are all already present.
- **Touch points.** The Codama card path (`app/features/decode-instruction-with-idl/ui/`, shared by the tx page
  and the inspector via `useIdlInstructionDecode`), a new feature slice for the fetch hook + UI, and pure decode
  helpers in an entity or `shared/lib`. `app/features/metadata/` is Metaplex off-chain metadata and is NOT the
  home for this.
- **Accepted limit (reconstruction ceiling).** Write-replay depends on RPC transaction-history retention. Public
  nodes prune old history, so an old buffer's writes may be gone and reconstruction is then impossible regardless
  of algorithm - the feature degrades to an explicit "incomplete, needs archival RPC" state rather than showing
  wrong or partial bytes.
- **Accepted risk (untrusted content).** Decoded bytes are attacker-controlled. Mitigations are in-scope from P1:
  bounded `pako` inflate (decompression-bomb guard), size caps with a hex/download fallback, `JSON.parse` only
  for `Format=Json` behind a size cap, no `dangerouslySetInnerHTML`, scheme-safe links plus http(s)-only,
  size-capped, timeout-bounded fetches for `Url` (P4, preferably via the server-side proxy), and a bounded
  `length` for `External` (P3).
- **Testability.** The pure decode + reconstruct functions are unit-testable without live RPC (out-of-order,
  overlapping, gap, reused-buffer, truncated-history, 96-byte-shift, decompression-cap fixtures). A ready fixture
  exists: `app/features/decode-instruction-with-idl/ui/__stories__/IdlInstructionCard.stories.tsx` feeds real PMP
  bytes through the decode path. Analytics is tested by mocking `trackEvent` and asserting the event name + params.
- **Analytics.** One feature-local analytics module (mirroring `interactive-idl/lib/analytics.ts`) firing
  `pmp_decode_*` events through the shared consent-gated `trackEvent`.
- **Open decisions** (FSD placement, UI layout, single RPC stack) are called out in `design.md` and settled at
  planning time. This proposal states the direction and the accepted trade-offs, not the final module layout.
