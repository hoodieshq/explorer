# instruction-card

## Purpose

One rendering layer for instruction cards, shared by `/tx/[signature]` and `/tx/(inspector)/inspector`. A card declares what an instruction means; the surface it renders on owns the chrome. Adding a field is one descriptor; adding a surface is one Context value.

## ADDED Requirements

### Requirement: Surface-owned chrome

Instruction cards MUST NOT receive surface chrome as props. The card frame, the address renderer, whether the leading `Program` row is emitted, and the transaction's `SignatureResult` SHALL be supplied by an `InstructionSurface` value through React Context.

This replaces the `InstructionCardComponent`, `AddressComponent`, and `showProgramField` injection props, and the inspector's `INSPECTOR_RESULT` / `INSPECTOR_SIGNATURE` placeholder constants. `useInstructionSurface` fails loudly rather than falling back to a default, matching `useInstructionParser`.

#### Scenario: Same card on both surfaces

- **WHEN** the same instruction renders on the tx page and in the inspector
- **THEN** the card component MUST be the same component in both cases
- **AND** only the surface value MUST differ

#### Scenario: Program row is claimed exactly once

- **WHEN** a surface's frame already renders a `Program` row of its own
- **THEN** that surface MUST set `showProgramField: false`
- **AND** exactly one `Program` row MUST appear in the rendered card

#### Scenario: Missing provider

- **WHEN** a card renders outside an `InstructionSurfaceProvider`
- **THEN** `useInstructionSurface` MUST throw

### Requirement: Fields declared as data

A card's rows SHALL be declared as `InstructionField` descriptors rather than as table markup. `InstructionFields` MUST be the only component that knows row markup, cell alignment, and which address renderer the current surface uses.

The union is closed: `address`, `sol`, `bytes`, `seed`, `text`, `custom`. `text` MUST accept only `string | number`, and `custom` MUST be the sole `ReactNode` door, so descriptors stay inspectable data instead of becoming opaque markup.

#### Scenario: Repeated shape earns its own kind

- **WHEN** the same value rendering repeats across cards
- **THEN** it MUST be added as an `InstructionField` kind
- **AND** those cards MUST NOT each re-implement it through `custom`

#### Scenario: Card needing real markup

- **WHEN** a card's content does not fit the descriptor vocabulary
- **THEN** it MAY render `InstructionCardView` with its own children instead
- **AND** it MUST still take its chrome from the surface

### Requirement: Single node prop

A card SHALL receive the instruction it renders as one `InstructionNode`, not as a spread of `ix`, `index`, `childIndex`, `raw`, and `innerCards`. Nested cards MUST NOT travel through cards as props — only the view hands `InstructionNode.innerCards` to the frame, and no card reads it.

`InstructionNode.children` is the target representation for CPI children and stays unpopulated until tree construction moves out of the render pass. `innerCards` is marked deprecated and is deleted in that same follow-up.

`InstructionNode.ix` is provisional: it exists for the frame, which needs `programId` and branches on `'parsed' in ix` for the Raw view. Cards MUST NOT read `node.ix`, so the field can be reshaped when the instruction-parser compat wrap is deleted without touching any card.

#### Scenario: Card is unaware of nesting

- **WHEN** an instruction has inner instructions
- **THEN** the card MUST NOT declare or read any nested-card prop
- **AND** the nested cards MUST reach the frame through the view

#### Scenario: Card reads only its decoded payload

- **WHEN** a card needs the instruction's program or raw bytes
- **THEN** it MUST obtain them from the frame or the surface, not from `node.ix`
- **AND** the card's own inputs MUST be limited to its decoded `info`

### Requirement: Whole-program migration

A program's cards SHALL migrate to the surface together in one change, never partially. A partially migrated program renders two different frames side by side in the inspector, because unmigrated cards hardcode the tx-page frame regardless of surface.

#### Scenario: Program with a hardcoded frame reaches the inspector

- **WHEN** a program's cards hardcode `InstructionCard` and the inspector routes to that program
- **THEN** all of that program's cards MUST migrate in the same change
- **AND** the resulting inspector chrome deltas MUST be reviewed before merge
