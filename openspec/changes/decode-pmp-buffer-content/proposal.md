# Proposal: Decode PMP buffer content on the instruction page

## Context

- The explorer already decodes Program Metadata Program (PMP, `ProgM6JCCvbYkfKqJYHePx4xxSUSqJp7rh8Lyv7nk7S`)
  instructions into accounts and args via the Codama dynamic-parser path (`useIdlInstructionDecode` ->
  `CodamaInstructionCard`). This works only because PMP self-publishes an on-chain IDL that `useProgramIdls`
  resolves at runtime - no PMP IDL is registered in the app runtime, so if that resolution fails the whole card
  path yields nothing. The typed instruction decoders shipped by `@solana-program/program-metadata` are a separate,
  bundled path that needs no IDL at all.
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

- **How to read the payload - re-decode raw ix bytes (chosen) vs use the Codama-parsed args.** The parser's
  scalar enum args are fine as they stand: it emits `encoding`/`compression`/`format`/`dataSource` as NUMBERS
  (`encoding: 3`, matching the library's `Encoding.Base64 === 3`), so no enum mapping is involved either way.
  What the parser cannot hand over is the PAYLOAD BYTES. It returns `data` as an `Option` wrapping a RE-ENCODED
  `['base64', string]` tuple rather than bytes, so the raw instruction bytes have to be re-obtained regardless.
  And the on-chain-valid 4-byte header-only `setData` is a shape Codama cannot parse at all, so a raw-bytes path
  is required for it no matter what the other shapes do. Chosen: re-decode `ix.data` (available at the card) with
  the library's typed `getSetDataInstructionDataDecoder`/`getInitializeInstructionDataDecoder`, which yields
  numeric enums plus a typed `Option<bytes>` in one step.
- **Where the bytes come from - branch on inline vs buffer.** `data` present means inline (0 RPC, exactly
  point-in-time correct). `data` empty means the bytes live in a referenced buffer account (`setData`) or the
  metadata PDA itself (`initialize` in-place), which must be reconstructed.
- **Reconstruction technique - write-replay (chosen) vs live account read.** A live `getAccountInfo` is cheap
  but gives the account's CURRENT state (wrong for a historical tx if it was later updated) and returns `null`
  for a foreign buffer, because the client closes that buffer right after `setData` to reclaim rent. Replaying
  the `write` history bounded by the viewed transaction's EXECUTION POSITION (slot, transactionIndex, intra-tx
  instruction index) is the point-in-time-correct method and the only option for a closed buffer. The live read is
  kept for the case where it IS authoritative (the viewed tx is the metadata account's current state), where it
  supersedes replay outright rather than feeding it a length.
- **Payload length - bounded (chosen) vs the write extent.** Sizing the reconstruction with
  `max(write.offset + length)` makes the coverage check circular: a pruned tail write shrinks the target, the check
  passes against the shrunken target, and truncated content renders as complete. Both existing implementations do
  exactly that (`@solana/idl`'s `reconstructBufferData`, PR #90's `applyWrite`) and neither bounds it from above, so
  there is no prior art to reuse. Chosen: derive the length from BOUNDS. The LOWER bound is a forward size replay in
  execution order over the creation size, `allocate`, `extend` and `write` auto-grow, none of which is exact, and
  retention can only make it too small. The UPPER bound is the account's rent-exempt balance, the only observation
  that can prove a length, and it counts only when a non-zero balance was seen at or after the account reached its
  final size. Equal bounds pin the length, anything else is an explicit best-effort state, and nothing may shorten
  the reconstruction below the replayed size. See `design.md` §4.2.
- **Reconstruction assembly - offset-patch (chosen) vs sequential append.** `getSignaturesForAddress` has no
  intra-slot index, so a strict oldest-first replay is non-deterministic within a slot. Patching each `write`
  chunk into a fixed-size buffer at its logical `offset` is order-independent for non-overlapping writes and
  sidesteps the ambiguity. The on-chain rule is still last-writer-wins in execution order, so the patching is done
  in `(slot, transactionIndex, ix index)` order and a conflicting overlap that those keys cannot resolve is reported
  with status `ambiguous` rather than resolved arbitrarily. On the fallback path `transactionIndex` is unavailable,
  so a same-slot transaction that cannot be ordered against the viewed one is EXCLUDED and flagged, never folded in.
- **Reconstruction transport - Triton `getTransactionsForAddress` fast path (chosen) with a universal fallback.**
  Triton is our production main RPC, so in production the fast path IS the primary path: one filtered, ordered,
  byte-carrying call per page instead of the `1 + N` `getSignaturesForAddress` + `getTransaction` fan-out, with the
  slot bound pushed server-side and `transactionIndex` available to order same-slot writes. The method is
  Triton/Helius-only, so a JSON-RPC `-32601` falls back to the two-step path for other clusters, which is the same
  try-then-fallback wiring `app/providers/accounts/history.tsx` already has. The availability limit is real and is
  accepted: only the fast path can order a same-slot conflicting overlap, so the fallback reports that case as
  `ambiguous` instead of returning bytes that silently disagree.
- **Integration point - a program-id-keyed PMP section (chosen) vs extending `CodamaInstructionCard`.** Two
  constraints decide it. A 4-byte header-only `setData` never produces a Codama decode at all, so it reaches
  `UnknownDetailsCard` and anything hung off the Codama card cannot run for it. And the whole card path is gated on
  runtime PMP IDL resolution (`useIdlInstructionDecode` returns `undefined` without an IDL) while P1 needs no IDL,
  since the typed decoders are bundled. The generic card stays PMP-free. FSD placement and the UI layout are still
  resolved at planning time.

## What Changes

Delivered as an ordered set of independently shippable phases (P1-P4, detailed in `design.md`). All four
content paths are in scope - the ordering isolates risk, it is not a scope cut.

- **P1 - Direct inline (0 RPC, no new deps).** Decode `setData`/`initialize` inline `data` (`dataSource=Direct`)
  via the typed decoders + `unpackDirectData`, and render the encoded (raw) bytes and decoded document side by
  side. Show the `write` chunk raw. JSON pretty-print (size-capped), YAML/TOML/text verbatim, Encoding None as
  hex. The guards that inline bytes need land here: the 256 KB render-size cap with a capped-preview/download
  fallback, and a LOCAL decode-error catch. Inline bytes are transaction-size bounded, so the output-bounded
  inflate belongs to P2/P3, where the bytes are not.
- **P2 - Buffer reconstruction (behind a "Decode" button).** Write-replay for `setData` foreign-buffer and
  `initialize` in-place, bounded by the viewed transaction's execution position, via a new SWR hook that reads the
  cluster url from `useCluster()`, builds a `Connection`, and either takes the Triton `getTransactionsForAddress`
  fast path or pages `getSignaturesForAddress` + `getTransaction`. Offset-patched assembly, the output-bounded
  inflate for reconstructed bytes, and explicit `incomplete` / `ambiguous` / `best-effort` states when writes are
  uncovered, unorderable, or RPC history is pruned.
- **P3 - External data source.** Resolve the `ExternalData{address, offset, length}` pointer, fetch the referenced
  account (bounded), slice, decode, and render per `format`, on the same RPC stack chosen for P2. The fetched
  content is live/current-state, not point-in-time.
- **P4 - Url data source.** Decode the on-chain bytes to a URL, show it as a scheme-safe link, and fetch + render
  its content per `format` behind the Decode action, guarded (http(s)-only, size cap, timeout, graceful
  CORS/failure). Client-side cross-origin fetches are often CORS-blocked, so route through the repo's existing
  server-side metadata proxy (`app/api/metadata/proxy`) when needed.
- **New units.** Pure `decodePmpPayload(bytes, config) -> string`, `deriveLength(inputs) -> LengthBounds` and
  `assemble(writes, bounds) -> Reconstruction` helpers (RPC-free, unit-testable), a new SWR fetch hook, and a
  "Decoded Content" UI section. The reconstruction entry point derives `data_length` itself and reports the bounds it
  came from - it takes no caller-supplied length, so no caller can obtain a `complete` verdict for a length nothing
  pinned. Status is the exclusive union `complete | incomplete | ambiguous | best-effort`. Their FSD placement is
  OPEN (see `design.md`), though `app/entities/program-metadata/` already exists as the PMP slice.
- **Analytics (GA).** Fire a Google Analytics event via the shared `trackEvent` (`app/shared/lib/analytics`) when
  the user triggers Decode (`pmp_decode_clicked`) and when it resolves (`pmp_decode_completed`, with `instruction`
  / `source` / `format` / `outcome`), following the interactive-IDL feature-local analytics pattern. The `source`
  param distinguishes reconstructed/fetched from just-parsed. P2 owns the extended `outcome` vocabulary
  (`decoded` / `incomplete` / `ambiguous` / `best-effort` / `failed`). This is how we measure whether the feature is
  used. No new deps - reuses the existing consent-gated GA wiring.

The `specs/` deltas cover all four phases, one capability each: `p1-program-metadata-content` (P1),
`p2-program-metadata-buffer-reconstruction` (P2), `p3-program-metadata-external-source` (P3), and
`p4-program-metadata-url-source` (P4). Implementation still lands phase by phase. Deferred to planning (this change
captures rationale + technical shape, not a task breakdown): `tasks.md`, the FSD placement, the UI layout, and
the single-RPC-stack choice.

## Impact

- **No new dependencies.** `@solana-program/program-metadata@0.7.0`, `pako@2.1.0`, `@microlink/react-json-view`,
  `@solana/kit@6.5.0`, and `@solana/web3.js@1.98.4` are all already present.
- **Touch points.** A program-id-keyed PMP section rendered alongside the Codama card path
  (`app/features/decode-instruction-with-idl/ui/`, shared by the tx page and the inspector via
  `useIdlInstructionDecode`), a new feature slice for the fetch hook + UI, and pure decode helpers in the existing
  `app/entities/program-metadata/` slice or `shared/lib`. `app/features/metadata/` is Metaplex off-chain metadata
  and is NOT the home for this.
- **Accepted limit (reconstruction ceiling).** Write-replay depends on RPC transaction-history retention. Public
  nodes prune old history, so an old buffer's writes may be gone and reconstruction is then impossible regardless
  of algorithm - the feature degrades to an explicit "incomplete, needs archival RPC" state rather than showing
  wrong or partial bytes. Two further cases degrade the same way rather than guessing: a `write` that copied from a
  source buffer (its bytes were never in a transaction), and a same-slot conflicting overlap on the fallback path
  (no intra-slot index to order it). A third degrades one step further, to best-effort: when nothing observed the
  account's balance at its final size, no upper bound exists, a pruned TAIL cannot be proven either way, and the
  result is labelled "may be truncated" instead of complete.
- **Accepted risk (untrusted content).** Decoded bytes are attacker-controlled. Mitigations are in-scope from P1:
  size caps with a capped-preview/download fallback (`HexData` is not usable for this - it renders either every byte
  or 8 head plus 8 tail), `JSON.parse` only for `Format=Json` behind a size cap, no `dangerouslySetInnerHTML`, and
  from P2/P3 the output-bounded `pako` inflate (decompression-bomb guard) for bytes that are not transaction-size
  bounded, plus scheme-safe links with http(s)-only, size-capped, timeout-bounded fetches for `Url` (P4) and a
  bounded `length` for `External` (P3).
- **Testability.** The pure decode + bounds + assemble functions are unit-testable without live RPC (out-of-order,
  duplicate, conflicting-overlap resolvable and ambiguous, buffer-rewrite, source-buffer write, gap, reused-buffer,
  truncated-history, header-only `setData`, 96-byte-shift, decompression-cap fixtures, plus one missing-tail-write
  fixture per length-bound input so a pruned tail can never shorten the target). No payload fixture exists to reuse:
  `app/features/decode-instruction-with-idl/ui/__stories__/IdlInstructionCard.stories.tsx` carries only `Allocate`
  and `SetAuthority` stories, both payload-free, so it is a rendering harness and the payload fixtures are new work.
  Analytics is tested by mocking `trackEvent` and asserting the event name + params.
- **Analytics.** One feature-local analytics module (mirroring `interactive-idl/lib/analytics.ts`) firing
  `pmp_decode_*` events through the shared consent-gated `trackEvent`.
- **Open decisions** (FSD placement, UI layout, single RPC stack) are called out in `design.md` and settled at
  planning time. This proposal states the direction and the accepted trade-offs, not the final module layout.
