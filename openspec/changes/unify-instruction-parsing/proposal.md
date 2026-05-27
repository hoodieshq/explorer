# Proposal: Unify instruction parsing across the tx page and inspector

## Context

- The `/tx/[signature]` page renders RPC-pre-parsed `ParsedInstruction` objects through per-program `*DetailsCard` components. The inspector (`/tx/(inspector)/inspector`) decodes a raw `VersionedMessage` locally and renders through a **parallel** pipeline rooted at its own `InstructionsSection`.
- The inspector's adapter (`app/components/inspector/into-parsed-data.ts`) covered only System, Associated Token, Token, Token-2022, and MPL Token Metadata — every other program (Stake, Vote, BPF, Memo, ALT, Compute Budget, Lighthouse, SAS, Anchor/Program Metadata IDL, …) fell back to `UnknownDetailsCard`.
- That adapter also mutated its input (`instruction.data`), shadowed `PROGRAM_INFO_BY_ID` with its own 4-entry registry, returned `any`, and routed `CreateAccountWithSeed` through a separate asymmetric path. Even when it produced a `ParsedInstruction`-shaped object, the inspector still rendered through its own card switch rather than the tx page's `InstructionCard`.

## Why

Every new program or `*DetailsCard` improvement had to land on **both** surfaces or the inspector silently fell behind — and it already had. With no shared contract test, the two pipelines drift apart and the same instruction renders differently depending on which page the user opened.

The goal: **one parser per program, one canonical shape, one place to add a program.** The inspector becomes a thin wrapper that feeds raw `TransactionInstruction`s through the same parsers the tx page already trusts via RPC pre-parsing. A contract test pins both paths to the same shape so they cannot disagree.

### Alternatives considered

- **Inspector mimics RPC's `ParsedInstruction` shape (original draft).** Rejected as asymmetric — it privileges the RPC shape and bakes web3.js's `parsed.info` structure into every slice. Chosen instead: each slice owns a canonical, typed `SliceParsed` (usually a discriminated union); **both** surfaces converge on it. RPC is not "the default"; the slice is.
- **Per-route dispatchers wired into each page.** Rejected in favor of a single shared dispatcher (`app/tx/instruction-parser-dispatcher.ts`) delivered once via `InstructionParserProvider` in `app/tx/layout.tsx`, the common ancestor of all `/tx` routes. Adding a program touches one list; every route inherits it.
- **Module-level global registry / a top-level `instruction-parsers/` barrel.** Rejected — the barrel violated FSD slice isolation and a global registry holds hidden state. Chosen instead: a pure `createInstructionParserDispatcher(parsers)` factory delivered through React Context.
- **Migrate all `*DetailsCard` components to consume `SliceParsed` now.** Deferred to a future change. A transitional compat wrap (`toParsedInstruction`) keeps the ~15-20 cards and their superstruct validators unchanged so this change stays additive; collapsing the render pipeline and deleting the wrap is out of scope here.
- **One Token slice covering Token + Token-2022.** Rejected — distinct `programId`s, distinct `@solana-program/*` packages, different instruction supersets. One slice per `programId`.

## What Changes

This change builds the shared foundation and migrates the five programs the inspector already parsed. It is intentionally additive — no card or validator changes, no behaviour change.

- Add the **`instruction-parser` entity** (`app/entities/instruction-parser/`): the `InstructionParser<P>` / `ParsedInstructionInfo` / `InstructionParserDispatcher` contract, the `createInstructionParserDispatcher` factory (throws on duplicate `programId`, holds no module state), the `InstructionParserProvider` / `useInstructionParser` Context delivery (hook throws outside a provider), and the transitional compat layer (`toParsedInstruction`, `toParsedTransaction`).
- Add **per-program feature slices** under `app/features/instruction-*/`: `instruction-system`, `instruction-token`, `instruction-token-2022`, `instruction-associated-token`, and `mpl-token-metadata`. Each publishes `fromTransaction` (raw kit bytes → `SliceParsed`) and, when the RPC pre-parses that program, `fromParsed`. Slice internals use `@solana/kit` and the `KitInstruction` bridge — no `@solana/web3.js` types.
- **Wire both surfaces through one shared dispatcher** at `app/tx/instruction-parser-dispatcher.ts`, provided once in `app/tx/layout.tsx`. The tx page normalises RPC input via `dispatcher.fromParsedInstruction(ix)` (pass-through for unsliced programs); the inspector decodes via `dispatcher.fromTransactionInstruction(ix)`.
- **Delete `app/components/inspector/into-parsed-data.ts`** and its ad-hoc parsers/registry.
- Add a **cross-pipeline contract test** asserting the byte-parsed and RPC-parsed paths produce equivalent, validator-satisfying `parsed.info` for the same logical instruction; it must extend by one assertion per new slice.
- The capability spec ships as a delta at `specs/instruction-parser/spec.md` within this change (optional artifact, included because the contract is non-trivial).

**Out of scope** (deliberately not in this change, tracked for follow-ups): inspector coverage for programs the old adapter never handled (Stake, Vote, ALT, BPF, Memo, Compute Budget, Lighthouse, SAS, Anchor/Program Metadata IDL, …); collapsing the two per-surface card switches into one render pipeline; deleting the compat wrap by migrating cards to consume `SliceParsed` directly.

## Impact

- **No user-facing behaviour change.** Cards and superstruct validators are untouched; the compat wrap preserves the existing prop interface. Parity between tx page and inspector is verified by the contract test and manual checks.
- **Adding a program** is now one slice plus one line in the shared dispatcher list; every `/tx` route picks it up through the layout provider.
- **Accepted transitional debt.** `toParsedInstruction` / `toParsedTransaction` are the *only* permitted shims and live in one file (`model/compat.ts`); double validation occurs while tx-page input flows through both `slice.fromParsed` and the card's `create(...)`. A future change that migrates cards to consume `SliceParsed` directly deletes the wrap and the second pass in one go.
- **Latent bugs fixed** during migration (previously hidden by `any`): wrong account keys on `Allocate`/`AllocateWithSeed` and Token-2022 pointer parsers, and unwrapped `Option<...>` fields on `EmitTokenMetadata` / `Initialize*Pointer`.
- **Known follow-ups:** this change is net-positive on its own (drift is mechanically prevented and both surfaces use slice-owned shapes internally), but the "one render pipeline, one prop interface" goal needs a later change that collapses the per-surface card switches and removes the compat wrap. Token-2022 `Initialize*Pointer` validators still expect non-nullable PublicKeys where the program allows `None` (pre-existing; parser passes `undefined`). Inspector currently decodes outer instructions only.
- **Conventions established:** `undefined` over `null` in new code; hyphenated filenames (`system-parser.ts`); `@solana/kit` + `@/app/shared/lib/web3js-compat` as the single web3.js bridge; FSD `model/` segment for entity domain logic + React bindings.
