# instruction-parser

## Purpose

One normalisation layer for Solana instruction data, shared by `/tx/[signature]` and `/tx/(inspector)/inspector`. Both surfaces fold their input through the same per-program slice and render the same `*DetailsCard` components. Adding a program is one slice plus one line in the shared dispatcher; a contract test pins the two paths to the same canonical shape so they cannot silently disagree.

## Architecture

```mermaid
flowchart TD
    A[Inspector<br/>TransactionInstruction] --> B[dispatcher.fromTransactionInstruction]
    C[TX page<br/>ParsedInstruction] --> D[dispatcher.fromParsedInstruction]
    P[TX page<br/>PartiallyDecodedInstruction] --> D

    B --> E[slice.fromTransaction]
    D --> F[slice.fromParsed]

    E --> G([SliceParsed])
    F --> G

    G --> H[[toParsedInstruction<br/>transitional wrap]]
    H --> I[ParsedInstruction]

    B -. no slice .-> U[/undefined → UnknownDetailsCard/]
    B -. slice, bad discriminator .-> N[/UnparsedInstruction → program-aware fallback/]
    D -. no slice / fromParsed undefined .-> R[/input passed through unchanged/]

    I --> J[&lt;DetailsCard ix=… /&gt;]
    R --> J
```

`SliceParsed` is the slice-owned canonical shape (typically a discriminated union). The compat layer at `app/entities/instruction-parser/model/compat.ts` holds every shim that lets inspector input flow through tx-page-designed cards: `toParsedInstruction` wraps `SliceParsed` back to `ParsedInstruction`, and `toParsedTransaction` builds a synthetic `ParsedTransaction` around a single instruction for cards that take a `tx` prop. Both disappear in one deletion when cards consume `SliceParsed` directly.

Both surfaces start from a union: the tx page receives `ParsedInstruction | PartiallyDecodedInstruction` (the RPC leaves any program it cannot pre-parse as a `PartiallyDecodedInstruction` carrying raw `accounts` + `data`); the inspector always starts from raw `TransactionInstruction`. `fromParsedInstruction` passes `PartiallyDecodedInstruction` through untouched — slices read it only via the byte path (`fromTransaction`), never by reaching into a half-parsed RPC shape.

## ADDED Requirements

### Requirement: Per-program parser slices

Each supported Solana program SHALL be implemented as a feature slice at `app/features/decode-instruction-<program>/` exposing an `InstructionParser<P>` value, where `P extends ParsedInstructionInfo` is the slice's canonical shape. The `decode-instruction-` prefix (not bare `instruction-`) keeps these decoder slices distinct from other instruction-related features and signals that they operate on raw buffer data.

The parser SHALL set `programId` (base58) and `programLabel` matching the RPC `program` field. It SHALL implement `fromTransaction(ix: KitInstruction): P | undefined` and MAY implement `fromParsed(ix: ParsedInstruction): P | undefined`. Slice internals MUST NOT import `@solana/web3.js` types — the bridge is `KitInstruction` from `@/app/shared/lib/web3js-compat`.

#### Scenario: RPC-parsed program publishes both paths

- **WHEN** a slice handles a program the RPC pre-parses (System, SPL Token, Token-2022, Associated Token)
- **THEN** the slice MUST publish both `fromTransaction` and `fromParsed`
- **AND** both paths MUST produce the same `SliceParsed` for the same logical instruction

#### Scenario: Non-RPC-parsed program omits fromParsed

- **WHEN** a slice handles a program the RPC does not pre-parse
- **THEN** the slice MUST publish only `fromTransaction`
- **AND** the dispatcher's `fromParsedInstruction` MUST pass that program's input through unchanged

### Requirement: Dispatcher contract

The entity at `app/entities/instruction-parser/` SHALL expose a factory `createInstructionParserDispatcher(parsers)` that throws on duplicate `programId`. The returned dispatcher SHALL expose three methods:

- `fromTransactionInstruction(ix): DispatchResult | undefined`
- `fromParsedInstruction(ix): ParsedInstruction`
- `getInstructionParser(programId): InstructionParser | undefined`

`DispatchResult` is `ParsedInstruction | UnparsedInstruction` where `UnparsedInstruction = { unknown: true; programLabel: string; programId: PublicKey }` — named as a sibling of `ParsedInstruction` so the union reads as two parallel outcomes of one decode attempt (a successfully parsed instruction, or one whose program is known but whose discriminator the slice could not decode), not two unrelated shapes. The dispatcher MUST be pure and MUST NOT hold module-level state. It is delivered to consumers via `InstructionParserProvider` / `useInstructionParser`; the hook MUST throw when used outside the provider.

#### Scenario: No parser registered

- **WHEN** `fromTransactionInstruction(ix)` is called for a program with no registered parser
- **THEN** the dispatcher MUST return `undefined`
- **AND** callers MUST treat that as "render `UnknownDetailsCard`"

#### Scenario: Parser exists, discriminator unknown

- **WHEN** the registered parser's `fromTransaction` returns `undefined`
- **THEN** the dispatcher MUST return `{ unknown: true, programLabel, programId }`
- **AND** callers MAY branch on `programLabel` to render a program-aware fallback card (e.g. MPL's "Unknown Instruction")

#### Scenario: fromParsedInstruction passes unknown input through

- **WHEN** `fromParsedInstruction(ix)` is called for a program with no slice, or the slice's `fromParsed` returns `undefined`
- **THEN** the dispatcher MUST return the input reference-equal to what was passed in

### Requirement: Single shared dispatcher

Every page that renders instruction cards SHALL consume the dispatcher exported from `app/tx/instruction-parser-dispatcher.ts`. The provider is wrapped once in `app/tx/layout.tsx` (the common ancestor of `/tx/[signature]`, `/tx/inspector`, and `/tx/[signature]/inspect`) via the `TxInstructionParserProvider` client component, so every `/tx` route inherits it and no page wraps its own. Routes needing a different parser set MUST compose their own via `createInstructionParserDispatcher` rather than mutating the shared list.

#### Scenario: Adding a new program

- **WHEN** a new program slice is added under `app/features/instruction-*/`
- **THEN** its parser is appended to the shared dispatcher's `parsers` list
- **AND** every `/tx` route picks up the new program through the layout provider with no further changes

#### Scenario: Adding a new /tx route

- **WHEN** a new page under `/tx` renders instruction cards
- **THEN** it inherits the dispatcher from `app/tx/layout.tsx` automatically
- **AND** it MUST NOT need its own `<InstructionParserProvider>` wrap

### Requirement: Compat layer is transitional

The compat shims at `app/entities/instruction-parser/model/compat.ts` SHALL be the only place that adapts inspector input to the tx-page card prop shape. `toParsedInstruction` is the only permitted bridge from `SliceParsed` to `ParsedInstruction`; `toParsedTransaction` is the only permitted way to build a synthetic `ParsedTransaction` around a single instruction. New compat shims of this kind MUST live in the same file. When cards migrate to consume `SliceParsed` directly, the whole file MUST be deleted together with its call sites.

#### Scenario: Dispatcher routes through the shared wrap

- **WHEN** the dispatcher produces a `ParsedInstruction` for a successfully decoded slice output
- **THEN** the wrap MUST come from `toParsedInstruction`, not be inlined inside the dispatcher
- **AND** removing `toParsedInstruction` MUST require updating only the dispatcher and the cards that consume `SliceParsed` directly

#### Scenario: Inspector synthetic tx comes from the compat layer

- **WHEN** the inspector renders a card that takes a `tx: ParsedTransaction` prop
- **THEN** the tx MUST be built via `toParsedTransaction` from the compat layer
- **AND** no other module in the codebase MUST fabricate a synthetic `ParsedTransaction`

### Requirement: No input mutation

The dispatcher and every slice parser MUST NOT mutate the input `TransactionInstruction` or `ParsedInstruction`. `toKitInstruction` MUST return a fresh object. The Associated Token discriminator workaround MUST construct a local `Uint8Array` via `{ ...ix, data: effective }` rather than writing to `ix.data`.

> Enforcement. This is enforced statically rather than by convention alone: parser inputs SHOULD be typed `Readonly`/`ReadonlyUint8Array` at the slice boundary so a write is a type error, and the `no-param-reassign` ESLint rule with `{ "props": true }` SHOULD be active for these slices so reassigning `ix.data` (or any input prop) fails lint. The "snapshot before/after" scenario below remains the runtime backstop.

#### Scenario: Dispatch leaves input untouched

- **WHEN** a slice parser or the dispatcher processes an instruction
- **THEN** the input object graph MUST be unchanged after the call
- **AND** snapshot comparisons before and after MUST find no difference

### Requirement: Cross-pipeline equivalence

A contract test SHALL assert, for every program with both `fromTransaction` and `fromParsed`, that the two paths produce `parsed.info` satisfying the same superstruct validator AND yielding equivalent field values for the same logical instruction. The test lives at `app/tx/__tests__/instruction-parser-contract.spec.ts` (the composition layer, so it may import feature slices without crossing the FSD entity→feature boundary) and MUST extend for every new slice.

> Caveat — known divergences. The two representations do not always carry the same information. The RPC `parsed.info` can differ from a local byte decode in cases such as multisig instructions (the RPC may surface resolved signer sets the wire bytes only reference by index) and any instruction whose RPC shape includes data the raw bytes do not. Where a field genuinely cannot agree across the two paths, the contract test SHALL assert equivalence only on the fields that *can* agree and MUST document the divergent field with a comment, rather than forcing both shapes into a single validator. "Same superstruct validator" is the goal for the common case, not an invariant claimed for every instruction.

#### Scenario: System Transfer parity

- **WHEN** the same `SystemProgram.transfer(...)` is dispatched via `fromTransactionInstruction(rawIx)` and `fromParsedInstruction(rpcIx)`
- **THEN** both `parsed.info` payloads MUST satisfy `TransferInfo`
- **AND** the validated `source`, `destination`, and `lamports` MUST be equal across the two paths

### Requirement: Program identifiers

Routing is keyed on `programId` (base58), which MUST be the canonical on-chain program address. `programLabel` is a *different* identifier: it is the RPC `parsed.program` discriminator string (e.g. `'system'`, `'spl-token'`, `'spl-token-2022'`, `'spl-associated-token-account'`), used by `fromParsed` to guard against mismatched RPC input (`if (ix.program !== 'spl-token') return undefined`). `programLabel` is therefore **not** the human-readable display name in `app/utils/programs.ts` (`PROGRAM_INFO_BY_ID`) or returned by `getProgramName()` in `app/utils/tx.ts` — those are titles like `System Program` / `Token Program`, which the slice never sets.

> Hardening note: `programLabel` is currently a bare `string`. A follow-up SHOULD type it against the RPC program-name set (e.g. a `PROGRAM_NAMES`-style enum) so a slice and the RPC guard cannot silently disagree on the discriminator spelling.

#### Scenario: Slice guards fromParsed on the RPC program field

- **WHEN** a slice declares `programLabel: '<rpc-program>'` and implements `fromParsed`
- **THEN** `fromParsed` MUST return `undefined` when `ix.program !== programLabel`
- **AND** `programId` (not `programLabel`) MUST be the base58 address the dispatcher routes on

### Requirement: Cards consume pre-parsed slice output

A `*DetailsCard` whose program has a registered slice parser MUST consume the dispatcher's already-parsed output rather than re-parsing the raw instruction. `MetaplexTokenMetadataDetailsCard` MUST accept an optional `parsedIx` prop; when provided with a non-empty `parsed.type`, the card MUST reuse it and skip its internal parse.

Cards whose program has **no** registered slice (the majority today — Stake, Vote, ALT, Memo, Lighthouse, SAS, Anchor/IDL, …) are unaffected by this change: `fromParsedInstruction` passes their input through unchanged and they continue to render exactly as before. This requirement governs only the cards whose program *does* have a slice; it does not require every card to gain a slice.

#### Scenario: Card with no registered slice is unchanged

- **WHEN** the dispatcher processes an instruction for a program with no registered slice
- **THEN** `fromParsedInstruction` MUST return the input unchanged and the existing `*DetailsCard` MUST render from it as it did before this change
- **AND** no new slice or `parsedIx` prop is required for that card

#### Scenario: Inspector renders MPL without double-parse

- **WHEN** the inspector routes an MPL instruction to the card with `parsedIx` set
- **THEN** the card MUST reuse `parsedIx.parsed.{type, info}`
- **AND** the card MUST NOT call `parseMetaplexTokenMetadataInstruction` again in the same render

#### Scenario: Tx-page predicate path self-parses

- **WHEN** the tx-page predicate branch routes a `PartiallyDecodedInstruction` to the MPL card without `parsedIx`
- **THEN** the card MUST parse internally via `parseMetaplexTokenMetadataInstruction(toKitInstruction(ix))`
