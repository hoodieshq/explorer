## Why

The explorer renders parsed program data (instruction names, decoded args, account state) from IDLs that arrive in two live standards — modern Anchor (>= 0.30, `metadata.spec`) and Codama root nodes (as the program-metadata program stores them) — plus a third, pre-0.30 legacy Anchor shape that must be recognized but not decoded. That logic lived inside `app/entities/idl` coupled to UI concerns, and the sibling MCP servers re-implement the same IDL discovery/decoding independently. One typed, UI-agnostic parsed-data core lets the app façade and the MCP endpoint share a single implementation with compile-time guarantees about which decode outcomes each IDL standard can produce.

Alternatives considered:

- *Keep per-standard branches app-side (status quo)* — rejected: duplicated across app + MCP repos, no type-level narrowing, UI coupling blocks reuse.
- *Anchor-first decode with Codama as the extra* — rejected: the Codama engine (`@codama/dynamic-parsers`) already decodes both standards once Anchor documents are converted via `@codama/nodes-from-anchor`; one pipeline beats two. The Anchor-rich path (events, nested account groups) stays a future seam, not a second engine.
- *Expose `client.standard` field* — rejected in favor of type-guard helpers (`isAnchorStandard`/`isCodamaStandard`), which narrow the client type instead of handing consumers a string to branch on.

## What Changes

- New private pnpm package `@explorer/idl` (`packages/idl`): standard detection, typed client, codama-primary decode pipeline, discriminator-based instruction naming, coded error family (`@codama/errors` pattern, error-first `Result` tuples).
- Client API: `createIdlClient<T>` (throws on lying types) / `tryCreateIdlClient` (error-first for untrusted input); decode methods return discriminated unions that narrow statically per standard — a Codama client cannot even express an anchor-arm handler. A standalone `getDecodedData(decode)` returns the payload regardless of which arm produced it (undefined for the unknown arm).
- Escape hatch: an injectable `legacyAnchorDecoder` option for modern Anchor documents the conversion route cannot handle — never bundled into the package.
- Legacy pre-0.30 documents: `isLegacyAnchorIdl` recognizes them; the client rejects them at compile time and runtime — consumers decode them with their own decoder.
- Two real Anchor fixture programs (`programs/simple` anchor-lang 1.1.2, `programs/simple-031` anchor-lang 0.31.1) build genuine IDLs consumed by the test suites via workspace package exports; tracked real-world snapshots (`let-me-buy` in both Anchor and PMP form, `tokenkeg` PMP) exercise the dual-standard story against mainnet documents.
- App extraction is NOT part of this change: `app/entities/idl` keeps its copy until the extraction pieces reconcile the app onto the package (mcp-endpoint plan, Pieces A/B).

## Capabilities

### New Capabilities

- `idl-detection`: recognize and narrow unknown documents into modern Anchor, Codama, or legacy Anchor; expose standard/version metadata helpers.
- `idl-client`: typed client construction over one IDL — program metadata reads, handler-map decode dispatch, static narrowing per standard, injectable legacy decoder seam.
- `idl-decoding`: single codama-normalized decode pipeline for instructions and accounts — address-mismatch fail-loud, conversion + parse error collection, miss-vs-failure semantics of the `unknown` arm.
- `instruction-naming`: discriminator-prefix name resolution (Anchor byte arrays, Codama constant int fields) with longest-prefix matching.

### Modified Capabilities

<!-- none — the package is additive; app-side behavior is unchanged until extraction -->

## Impact

- New code: `packages/idl/src/**` (8 implementation modules + the `index.ts` barrel), unit/type suites in `src/__tests__`, integration suite in `tests/integration` running against the built `dist`.
- Workspace: `pnpm-workspace.yaml` gains `packages/idl/programs/*`; program packages are devDependencies of `@explorer/idl`; building them requires the Rust/Anchor toolchain (avm-managed, pinned per program workspace).
- Dependencies: `@codama/dynamic-parsers` + `@codama/nodes-from-anchor` (runtime), `@coral-xyz/anchor` / `codama` / `@solana/kit` (peers). `@solana/web3.js` stays out of the public API (kit-first).
- Tooling diverges from the repo: oxlint replaces eslint for this package (root eslint config ignores it) and `dist` is emitted with `oxc-transform` under isolated declarations (`tsc --noEmit` still enforces types).
- Not affected yet: `app/entities/idl` and `app/features/decode-instruction-with-idl` continue to run their own copies until the extraction change lands.
