# custom-program-idl

## Purpose

A user-supplied IDL for a program, stored in the user's browser and selectable against the program's on-chain IDLs on every client surface that reads them.

## ADDED Requirements

### Requirement: A custom IDL stays in the user's browser

The custom IDL SHALL be stored only in the browser's `localStorage`, and MUST NOT be sent to an Explorer `/api/*` route or written into a URL.

#### Scenario: Adding an IDL

- **WHEN** the user adds a custom IDL for a program
- **THEN** the IDL MUST be readable from `localStorage` under the program address
- **AND** no network request MUST carry the IDL content

### Requirement: One custom IDL per program address

The store SHALL hold at most one custom IDL per program address, shared by every cluster.

#### Scenario: Replacing an IDL

- **WHEN** the user adds a custom IDL for a program that already has one
- **THEN** the store MUST hold only the new IDL for that program address

#### Scenario: Switching clusters

- **WHEN** the user has a custom IDL for a program and switches from devnet to mainnet
- **THEN** the program MUST resolve the same custom IDL on mainnet

### Requirement: Upload rejects an IDL for another program

An uploaded IDL MUST be rejected when it is not an Anchor or Codama IDL, or when it declares a program address different from the target program.

#### Scenario: Address mismatch

- **WHEN** the user uploads an IDL whose `address` names another program
- **THEN** the upload MUST fail with an error naming both addresses
- **AND** the store MUST stay unchanged

#### Scenario: Legacy Anchor IDL without an address

- **WHEN** the user uploads a legacy Anchor IDL that declares no address
- **THEN** the upload MUST succeed

### Requirement: The selection applies to every surface that decodes the program

The selection SHALL be one value per program, and `useProgramIdls` and `useProgramIdlNames` MUST return the selected IDL to every consumer, except a consumer that reads another program's accounts for an Explorer card without an IDL selector. That consumer MUST receive the on-chain IDL.

#### Scenario: Custom IDL selected on the IDL tab

- **WHEN** the user selects the custom IDL on a program's IDL tab and opens a transaction that calls the program
- **THEN** the transaction's instruction cards for the program MUST decode with the custom IDL

#### Scenario: Card that reads another program's accounts

- **WHEN** the user selects a custom IDL for the Squads program and opens a program whose upgrade authority is a Squads multisig
- **THEN** the upgrade-authority multisig card MUST decode the multisig account with the Squads on-chain IDL
- **AND** the card MUST NOT carry the custom-IDL highlight

#### Scenario: Selection after upload

- **WHEN** the user adds a custom IDL
- **THEN** the custom IDL MUST become the selected source for the program

### Requirement: Strict decode under the custom IDL

When the custom IDL is selected, the program's on-chain IDLs MUST NOT be used as a fallback.

#### Scenario: Instruction missing from the custom IDL

- **WHEN** the custom IDL is selected and an instruction's discriminator is not in it
- **THEN** the instruction card MUST state, in a row inside the card, that the custom IDL could not decode the instruction
- **AND** the card MUST NOT show the on-chain decode

#### Scenario: Another IDL decodes the instruction

- **WHEN** the selected IDL fails and another IDL of the program decodes the instruction
- **THEN** the failure row MUST offer that IDL, and selecting it MUST switch the program to it

#### Scenario: No IDL decodes the instruction

- **WHEN** no IDL of the program decodes the instruction
- **THEN** the failure row MUST offer to add a custom IDL

### Requirement: The custom IDL selection is visible

A program's IDL selector MUST be highlighted while its custom IDL is selected, and every instruction card with raw bytes MUST carry its program's selector.

#### Scenario: Decoded instruction

- **WHEN** an instruction card renders a decode produced by the custom IDL
- **THEN** the card header MUST show the program's selector, highlighted

#### Scenario: RPC-parsed instruction

- **WHEN** the RPC returns an instruction pre-parsed, without raw bytes
- **THEN** its card MUST NOT show an IDL selector

#### Scenario: On-chain IDL selected

- **WHEN** the on-chain IDL is selected
- **THEN** the selector MUST NOT carry the custom-IDL highlight
