# @explorer/idl

Detection, parsing, and decoding for Solana program IDLs. Supports three IDL standards:

- *Anchor* — modern spec `0.1.0` documents emitted by `anchor build` since Anchor 0.30
- *Legacy Anchor* — pre-0.30 documents (top-level `name`/`version`, no `metadata.spec`)
- *Codama* — Codama root nodes (PMP-style program metadata)

## Modules

- `detect` — type guards and version helpers (`isAnchorIdl`, `isCodamaIdl`, `isLegacyAnchorIdl`, `getIdlStandard`, `getIdlVersion`)
- `client` — `createIdlClient` / `tryCreateIdlClient`, a uniform facade over the supported standards
- `decode-instruction` — `decodeInstructionWithIdl` for raw instruction data
- `decode-account` — `decodeAccountWithIdl` for raw account data
- `names` — instruction/program name resolution (`buildInstructionNameResolver`, `buildProgramName`)
- `errors` — `Result`-style `ok`/`err` helpers and `IDL_ERROR__*` codes
- `types` — `AnchorIdl`, `LegacyAnchorIdl`, `CodamaIdl`, `SupportedIdl`, decode handler types

## Fixture programs

`programs/` contains two real Anchor workspaces whose generated IDLs feed the test suite:

- `programs/simple` — anchor-lang 1.1.2
- `programs/simple-031` — anchor-lang 0.31.1

Both implement the same minimal program (one account, one instruction argument, one error, one event), so their IDLs are directly comparable across Anchor versions.

## Development

```sh
pnpm --filter @explorer/idl test
```

See [DEVELOPMENT.md](./DEVELOPMENT.md) for running tests and building the fixture programs.
