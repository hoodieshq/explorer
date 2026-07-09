# Development

## Running tests

From the repo root:

```sh
pnpm --filter @explorer/idl test        # vitest run (includes type tests)
pnpm --filter @explorer/idl test:watch  # vitest watch mode
pnpm --filter @explorer/idl typecheck   # tsc --noEmit
```

Running the suite needs **no** Rust/Anchor toolchain: specs consume committed snapshots of the Anchor IDLs (`__fixtures__/simple.json` + companion `__fixtures__/simple.ts`, and the `simple_031` pair) through `loadSimpleIdl` / `loadSimpleIdlTyped` / `loadSimple031Idl` (defined in `src/__tests__/fixtures.ts`, which reads `packages/idl/__fixtures__/`). The toolchain below is only needed to **regenerate** those snapshots after changing the Rust programs.

## Building the fixture programs

`test-anchor-programs/` contains two real Anchor workspaces whose generated IDLs feed the test suite:

- `test-anchor-programs/simple` — anchor-lang 1.1.2
- `test-anchor-programs/simple-031` — anchor-lang 0.31.1

Both implement the same minimal program (one account, one instruction argument, one error, one event), so their IDLs are directly comparable across Anchor versions.

`test-codama-programs/` holds Codama fixtures that need no build — plain data consumed directly:

- `test-codama-programs/memo` (`@explorer/test-idl-program-memo`) — a real PMP root-node snapshot (single discriminator-less instruction)
- `test-codama-programs/vault` (`@explorer/test-idl-program-vault`) — an `as const` root node whose literal type drives the codama inference specs

Ready-made IDLs also come from the `codama-fixtures` devDependency (a pinned tarball of the codama repo): functional specs import its `dynamic-client` test IDLs as-is, and `scripts/generate-codama-types.mjs` renders typed clients from them into `__tests__/functional/generated/`.

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
pnpm --filter @explorer/test-idl-program-simple build
pnpm --filter @explorer/test-idl-program-simple-031 build
```

`build:programs` compiles each workspace into `target/idl/*.json` + `target/types/*.ts` (both gitignored) and then copies them into the committed snapshots under `__fixtures__/` (via `scripts/copy-anchor-artifacts.mjs`). It is a standalone regeneration step, never part of the test pipeline:

```sh
pnpm --filter @explorer/idl build:programs   # anchor build + copy into the committed snapshots
```

Commit the refreshed snapshots — the suite reads those committed copies, not the live `target/`, so it never invokes the toolchain.

### Gotchas

- `test-anchor-programs/simple-031/Cargo.lock` carries deliberate downgrades (`blake3`, `proc-macro-crate`, `indexmap`, `jobserver`, `unicode-segmentation`, `zeroize_derive`, `syn`): the cargo bundled with Solana platform tools (1.84) cannot parse `edition2024` manifests. A bare `cargo update` in that workspace will re-break the build.
- Program keypairs live in gitignored `target/deploy/`. A fresh clone regenerates them, so `anchor build` will report a program ID mismatch — run `anchor keys sync` in the affected workspace (via `pnpm --filter <pkg> exec anchor keys sync`) and rebuild.
