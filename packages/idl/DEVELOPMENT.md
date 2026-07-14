# Development

## Running tests

From the repo root:

```sh
pnpm --filter @explorer/idl test        # vitest run (includes type tests)
pnpm --filter @explorer/idl test:watch  # vitest watch mode
pnpm --filter @explorer/idl typecheck   # tsc --noEmit
```

Running the suite needs **no** Rust/Anchor toolchain: specs consume committed snapshots of Anchor IDLs through the packages in `test-anchor-programs/`. Buildable packages preserve `.` as the live `target/idl/*.json` output, and expose committed snapshots at `./idl` for the raw JSON and `./generated-types` for the companion type module. Static snapshot packages use `.` and `./idl` for the same committed raw JSON. `src/__tests__/fixtures.ts` wraps the commonly used imports as `loadSimpleIdl` / `loadSimpleIdlTyped` / `loadSimple031Idl` / real-world snapshot loaders. The toolchain below is only needed to **regenerate** snapshots after changing Rust programs.

## Building the fixture programs

`test-anchor-programs/` contains two real Anchor workspaces whose generated IDLs feed the test suite:

- `test-anchor-programs/simple` — anchor-lang 1.1.2
- `test-anchor-programs/simple-031` — anchor-lang 0.31.1

Both implement the same minimal program (one account, one instruction argument, one error, one event), so their IDLs are directly comparable across Anchor versions. Each Anchor package ships committed snapshot entries for test imports: `./idl` — the raw IDL JSON — and `./generated-types` — the generated Anchor companion type module.

The same directory also contains static Anchor snapshot packages for mainnet and stress fixtures (`amm-v3`, `dummy-transfer-hook`, `example-native-token-transfers`, `let-me-buy`, `ntt-transceiver`, `wormhole-governance`). These have no build script; edit the committed JSON/type modules directly when refreshing the fixture. Variant IDLs are exposed with named subpaths such as `./pmp-idl`, `./legacy-idl`, and `./codama`.

Anchor fixture packages that need a committed Codama literal opt in with `explorer.codamaFromAnchor` in their `package.json`. Regenerate all opted-in literals from the root package:

```sh
pnpm --filter @explorer/idl run generate:anchor-codama
```

or regenerate one package:

```sh
pnpm --filter @explorer/test-idl-program-example-native-token-transfers run generate:codama
```

`test-codama-programs/` holds Codama fixtures that need no build — plain data consumed directly.
Each package ships two entries: `.` — a literal (`as const`) TS module whose type drives the codama
inference specs — and `./idl` — the raw JSON root node for wide (runtime-shaped) specs. The
JSON is the source of truth: the literal module is generated from it by
`scripts/generate-codama-literals.mjs` (`pretest` re-runs it), so edits go into the JSON only.

- `test-codama-programs/memo` (`@explorer/test-idl-program-memo`) — a real PMP root-node snapshot (single discriminator-less instruction)
- `test-codama-programs/vault` (`@explorer/test-idl-program-vault`) — a hand-authored minimal root (one instruction, one size-identified account)

Ready-made IDLs also come from the `codama-fixtures` devDependency (a pinned tarball of the codama repo): functional specs import its `dynamic-client` test IDLs as-is, and `scripts/generate-codama-types.mjs` renders typed clients from them into `__tests__/generated/`.

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
pnpm --filter @explorer/test-idl-program-simple run build:anchor
pnpm --filter @explorer/test-idl-program-simple-031 run build:anchor
```

The script is named `build:anchor` (not `build`) on purpose: the root `build:packages` runs
`pnpm -r run build` across `packages/**`, and a `build` script here would drag the Rust/Anchor
toolchain into every standard build (CI included).

`build:programs` compiles each workspace into `target/idl/*.json` + `target/types/*.ts` (both gitignored) and then copies them into the committed snapshots in each test-program package, plus the legacy `__fixtures__/simple*.{json,ts}` mirrors (via `scripts/copy-anchor-artifacts.mjs`). It is a standalone regeneration step, never part of the test pipeline:

```sh
pnpm --filter @explorer/idl build:programs   # anchor build + copy into the committed snapshots
```

Commit the refreshed snapshots — the suite reads those committed copies, not the live `target/`, so it never invokes the toolchain. To refresh one Anchor package after building it, run its `copy:artifacts` script.

### Gotchas

- `test-anchor-programs/simple-031/Cargo.lock` carries deliberate downgrades (`blake3`, `proc-macro-crate`, `indexmap`, `jobserver`, `unicode-segmentation`, `zeroize_derive`, `syn`): the cargo bundled with Solana platform tools (1.84) cannot parse `edition2024` manifests. A bare `cargo update` in that workspace will re-break the build.
- Program keypairs live in gitignored `target/deploy/`. A fresh clone regenerates them, so `anchor build` will report a program ID mismatch — run `anchor keys sync` in the affected workspace (via `pnpm --filter <pkg> exec anchor keys sync`) and rebuild.
