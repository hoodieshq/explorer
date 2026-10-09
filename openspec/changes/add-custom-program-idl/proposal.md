# Proposal: Let a user decode a program with their own IDL

## Context

The Explorer reads a program's IDL only from the chain: the Anchor IDL account and the Program Metadata (PMP) `idl` seed, both resolved by `useProgramIdls` (see [`consolidate-idl-resolution`](../consolidate-idl-resolution/proposal.md)). A developer whose IDL is not published yet, or whose published IDL is older than the deployed program, cannot browse the IDL, call instructions through Interactive IDL, or read decoded transactions without first writing the IDL on-chain. An auditor holding an IDL from a repository or an SDK has the same problem with programs that never publish one.

Linear: [HOO-1971](https://linear.app/solana-fndn/issue/HOO-1971/idl-upload).

## Why

A user adds a custom IDL for a program, and every client surface that reads the program's IDL can use it: the IDL tab with Interactive IDL, transaction instruction cards, program logs, Anchor events, the inspector, and decoded program-owned accounts. The choice between the on-chain IDL and the custom one is one setting per program, made from a selector on those surfaces.

Decisions and the alternatives they beat:

- **Stored in the browser, never sent to the Explorer's server or put in a URL.** A shareable IDL link lets anyone rename `transfer` to `claim_airdrop` and show the result on the Explorer's domain. Rejected alternatives: a URL parameter (phishing vector), a server-side registry (accounts, moderation, and a trust model that is a separate product). Accepted cost: server-rendered surfaces (share images, OG previews) keep showing the on-chain IDL.
- **At most one custom IDL per program address.** Several candidates per program need a picker with its own conflict rules for little gain; a user who wants another version replaces the stored one. Versions selected by slot range are out of scope.
- **Keyed by program address only, across clusters.** A developer deploys the same address to devnet and mainnet and expects the IDL to follow it. Keying by cluster as well is safer against a devnet IDL decoding mainnet data, but the yellow highlight on every value the custom IDL produces makes that state visible, and the Interactive IDL mainnet confirmation names the custom IDL before a signature.
- **One selection per program, shared by every surface.** A per-page choice makes the user re-enable the custom IDL on each page. The yellow selector is the reminder that it is active.
- **A selector on every instruction card that still has its raw bytes.** Each instruction, top-level or inner, is decoded by its own program, so one program, one choice: a card carries its own program's selector, and cards of the same program stay in sync. Rejected: one combined control in the transaction header, which needs a per-program menu and sits away from the instruction it changes.
- **Strict when the custom IDL is selected.** The on-chain sources drop out of the resolution, so an instruction the custom IDL cannot decode renders as a decode failure, not as the on-chain result. The failure row, inside the card, tries the program's other IDLs and offers each one that decodes the instruction, or an upload when none does. Rejected: a silent fallback to the on-chain IDL hides from a developer that their IDL does not match the program.
- **Override inside `useProgramIdls` and `useProgramIdlNames`.** Every client consumer already reads the IDL through these two hooks, so one override reaches all of them and the surfaces cannot diverge. Rejected: per-surface overrides, which would repeat the selection logic in each card.
- **Not applied where the Explorer reads another program's accounts for a card of its own.** The program page decodes Squads accounts for the upgrade-authority multisig card and verification-program accounts for the verified-build card. Both cards show who can upgrade the program and whether its build is verified, and neither carries a selector or a highlight, so a custom IDL stored for Squads or the verification program would change them with nothing on the page that says why or switches back. These callers read the on-chain IDL through `onChainOnly`. Rejected: a selector and a highlight on these cards, which name a program the page is not about.
- **The selected custom IDL wins over the Explorer's own program decoders, not over the RPC's.** Instructions the RPC returns pre-parsed (System, Token, Stake, Vote, …) carry no raw bytes, so a custom IDL has nothing to decode for them, and their cards carry no selector. Every other instruction has its bytes, and a user who selected a custom IDL for its program expects it applied, so it takes precedence over the program-specific decoders (Compute Budget, Pyth, Serum, …).
- **`localStorage` through a jotai `atomWithStorage`.** Synchronous reads keep `useProgramIdls` free of a loading state for the custom source, and the atom syncs open tabs. IndexedDB holds more but makes every read asynchronous. An upload that exceeds the storage quota fails with a message instead of evicting other data.

## What Changes

- **Storage and selection** in the `idl` entity: a validated `atomWithStorage` maps a program address to its custom IDL and its selected source (`anchor` when the user picks the Anchor IDL over PMP, `custom`, or absent for the default on-chain policy).
- **Resolution**: `useProgramIdls` applies the selection to the on-chain pair and reports which source it returned, unless the caller passes `onChainOnly`; `useProgramIdlNames` builds names from the custom IDL for programs that select it, including on custom clusters and for builtin addresses.
- **Upload validation**: the JSON must be an Anchor or Codama IDL; an IDL that declares a different program address is rejected. Legacy Anchor IDLs are accepted; Interactive IDL already hides itself for them.
- **UI** in the `idl` entity, because features cannot import each other and four surfaces need it:
    - an IDL selector (`IDL: PMP`, `IDL: Anchor`, `IDL: Custom`) that lists every on-chain source found plus the custom IDL, with add, or replace and remove; the upload dialog explains what the IDL is used for and takes a file or pasted JSON; the selector is yellow while the custom IDL is selected;
    - the IDL tab shows the selector in the card header, where it also replaces the empty-state upload prompt;
    - every instruction card with raw bytes, on the transaction page and in the inspector, shows its program's selector in the card header, through a slot the instruction list fills;
    - a card whose decode failed says so in a row inside the card, offering the program's other IDLs that decode the instruction, or an upload when none does;
    - the program name in logs and in the program header takes a yellow background while it comes from the custom IDL; a data account owned by the program carries the owner's selector in the header of its Overview card, which stays above every account tab, so the decoded Anchor Data card needs no selector of its own;
    - the Interactive IDL mainnet confirmation names the custom IDL when it is selected.

## Impact

- **Files:** `app/entities/idl/model/custom-idl/*`, `app/entities/idl/ui/*`, `useProgramIdls`, `useProgramIdlNames`, `IdlCard`, the transaction and inspector `InstructionsSection`, the instruction card shells and their Unknown cards, `IdlInstructionCard` with `IdlDecodeFailureNotice`, `ProgramLogsCardBody`, `ProgramHeader`, the account cards, the Interactive IDL mainnet dialog, and the on-chain-only reads in `ProgramMultisigCard` and `verified-builds`.
- **Accepted risks:** an IDL stored for a program address applies on every cluster; a large IDL may not fit the browser storage quota; share images and OG previews never reflect a custom IDL.
- **Out of scope:** sharing a custom IDL, IDL versions by slot, publishing the custom IDL on-chain from the Explorer, a page listing every stored custom IDL.
- **IDL tab highlight:** the selected custom IDL turns the Program IDL card's edge yellow, because both the overview and Interactive IDL read the selected IDL. Rejected: tinting the Interactive IDL form inputs one by one, which leaves the instruction list and the overview unmarked.
