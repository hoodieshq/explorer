# instruction-parser

## Purpose

One normalisation layer for Solana instruction data, shared by `/tx/[signature]` and `/tx/(inspector)/inspector`. Both surfaces fold their input through the same per-program slice and render the same `*DetailsCard` components. Adding a program is one slice plus one line in the shared dispatcher; a contract test pins the two paths to the same canonical shape so they cannot silently disagree.

## Architecture

```
  Inspector                              TX page
  TransactionInstruction                 ParsedInstruction
          │                                      │
          ▼                                      ▼
  dispatcher.fromTransactionInstruction   dispatcher.fromParsedInstruction
          │                                      │
          ▼                                      ▼
  slice.fromTransaction                   slice.fromParsed
          │                                      │
          └──────────► SliceParsed ◄─────────────┘
                            │
                            ▼  toParsedInstruction (transitional wrap)
                            │
                            ▼
                      ParsedInstruction
                            │
                            ▼
                    <DetailsCard ix={…} />
```

`SliceParsed` is the slice-owned canonical shape (typically a discriminated union). The compat layer at `app/entities/instruction-parser/model/compat.ts` holds every shim that lets inspector input flow through tx-page-designed cards: `toParsedInstruction` wraps `SliceParsed` back to `ParsedInstruction`, and `toParsedTransaction` builds a synthetic `ParsedTransaction` around a single instruction for cards that take a `tx` prop. Both disappear in one deletion when cards consume `SliceParsed` directly.

## Requirements

### Requirement: Per-program parser slices

Each supported Solana program SHALL be implemented as a feature slice at `app/features/instruction-<program>/` exposing an `InstructionParser<P>` value, where `P extends ParsedInstructionInfo` is the slice's canonical shape.

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

`DispatchResult` is `ParsedInstruction | DispatchUnknown` where `DispatchUnknown = { unknown: true; programLabel: string; programId: PublicKey }`. The dispatcher MUST be pure and MUST NOT hold module-level state. It is delivered to consumers via `InstructionParserProvider` / `useInstructionParser`; the hook MUST throw when used outside the provider.

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

#### Scenario: Dispatch leaves input untouched

- **WHEN** a slice parser or the dispatcher processes an instruction
- **THEN** the input object graph MUST be unchanged after the call
- **AND** snapshot comparisons before and after MUST find no difference

### Requirement: Cross-pipeline equivalence

A contract test SHALL assert, for every program with both `fromTransaction` and `fromParsed`, that the two paths produce `parsed.info` satisfying the same superstruct validator AND yielding equivalent field values for the same logical instruction. The test lives at `app/entities/instruction-parser/__tests__/contract.spec.ts` and MUST extend for every new slice.

#### Scenario: System Transfer parity

- **WHEN** the same `SystemProgram.transfer(...)` is dispatched via `fromTransactionInstruction(rawIx)` and `fromParsedInstruction(rpcIx)`
- **THEN** both `parsed.info` payloads MUST satisfy `TransferInfo`
- **AND** the validated `source`, `destination`, and `lamports` MUST be equal across the two paths

### Requirement: Program labels single-source

Each slice's `programLabel` MUST match the entry in `app/utils/programs.ts` (`PROGRAM_INFO_BY_ID`) and the value returned by `getProgramName()` in `app/utils/tx.ts`. Drift between slice labels and the registry would silently route to the wrong card.

#### Scenario: Slice label matches the registry

- **WHEN** a new slice declares `programLabel: '<label>'`
- **THEN** `PROGRAM_INFO_BY_ID` MUST already publish that label for the same `programId`, or be updated in the same change
- **AND** `getProgramName()` MUST return that label for the same address

### Requirement: Memoised per-instruction dispatch

The inspector and tx-page `InstructionsSection.tsx` consumers SHALL wrap their dispatcher calls in `useMemo` keyed on the instruction reference, so superstruct validation and `PublicKey` allocations do not re-run on every parent re-render. `useMemo` calls MUST precede any conditional return to respect React's rules-of-hooks.

#### Scenario: Hover does not re-dispatch

- **WHEN** a parent re-renders for a reason orthogonal to the instruction set (hover, expand, scroll anchor)
- **THEN** the dispatcher MUST NOT re-execute for the same `ix` reference
- **AND** no new `PublicKey` instances MUST be allocated for unchanged inputs

### Requirement: Cards consume pre-parsed slice output

A `*DetailsCard` whose program has a registered slice parser MUST consume the dispatcher's already-parsed output rather than re-parsing the raw instruction. `MetaplexTokenMetadataDetailsCard` MUST accept an optional `parsedIx` prop; when provided with a non-empty `parsed.type`, the card MUST reuse it and skip its internal parse.

#### Scenario: Inspector renders MPL without double-parse

- **WHEN** the inspector routes an MPL instruction to the card with `parsedIx` set
- **THEN** the card MUST reuse `parsedIx.parsed.{type, info}`
- **AND** the card MUST NOT call `parseMetaplexTokenMetadataInstruction` again in the same render

#### Scenario: Tx-page predicate path self-parses

- **WHEN** the tx-page predicate branch routes a `PartiallyDecodedInstruction` to the MPL card without `parsedIx`
- **THEN** the card MUST parse internally via `parseMetaplexTokenMetadataInstruction(toKitInstruction(ix))`
