# Development

## Running tests

From the repo root:

```sh
pnpm --filter @explorer/idl test        # vitest run (includes type tests)
pnpm --filter @explorer/idl test:watch  # vitest watch mode
pnpm --filter @explorer/idl typecheck   # tsc --noEmit
```

`test` runs `build:programs` first via the `pretest` hook, so running the suite needs the toolchain listed below. Specs consume the generated IDLs through `loadSimpleIdl` / `loadSimple031Idl` (re-exported from `src/__tests__/generated/`), which resolve the `@explorer/idl-program-*` packages — each exports its live `target/idl/*.json`.

## Building the fixture programs

`test-anchor-programs/` contains two real Anchor workspaces whose generated IDLs feed the test suite:

- `test-anchor-programs/simple` — anchor-lang 1.1.2
- `test-anchor-programs/simple-031` — anchor-lang 0.31.1

Both implement the same minimal program (one account, one instruction argument, one error, one event), so their IDLs are directly comparable across Anchor versions.

Ready-made IDLs come from the `codama-fixtures` devDependency (a pinned tarball of the codama repo): functional specs import its `dynamic-client` test IDLs as-is, and `scripts/generate-codama-types.mjs` renders typed clients from them into `__tests__/functional/generated/`.

Prerequisites:

- Rust toolchain
- Solana CLI (agave 2.2.x)
- Anchor CLI managed by [avm](https://www.anchor-lang.com/docs/installation) — each program workspace pins its CLI via `anchor_version` in its `Anchor.toml`, and the `anchor` binary switches (and auto-installs) the version per workspace

Build both programs:

```sh
pnpm --filter @explorer/idl build:programs
```

or one at a time:

```sh
pnpm --filter @explorer/idl-program-simple build
pnpm --filter @explorer/idl-program-simple-031 build
```

Generated IDLs land in each workspace's `target/idl/` (gitignored) and reach the tests through each program package's `exports` — no copying step.

### Gotchas

- `test-anchor-programs/simple-031/Cargo.lock` carries deliberate downgrades (`blake3`, `proc-macro-crate`, `indexmap`, `jobserver`, `unicode-segmentation`, `zeroize_derive`, `syn`): the cargo bundled with Solana platform tools (1.84) cannot parse `edition2024` manifests. A bare `cargo update` in that workspace will re-break the build.
- Program keypairs live in gitignored `target/deploy/`. A fresh clone regenerates them, so `anchor build` will report a program ID mismatch — run `anchor keys sync` in the affected workspace (via `pnpm --filter <pkg> exec anchor keys sync`) and rebuild.
