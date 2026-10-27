# Remove Tailwind `e-` prefix — pixel-parity campaign (RESUME)

Goal: drop the `e-` Tailwind prefix project-wide with **zero visual drift**. Validate via static:static
screenshot diff (BEFORE = prefix present, AFTER = prefix removed) — same worktree, same fixtures, so any
drift is a real bug, not env/fixture divergence.

## Worktree / branch

- Worktree: `/Users/rogaldh/Projects/solana-explorer/.worktrees/chore/remove-tailwind-e-prefix`
- Branch: `chore/remove-tailwind-e-prefix` (off `9971daf0`, tip of `feat/remove-dashkit-scss-bundle-replant`)
- All changes are **uncommitted** (working tree).

## Uncommitted source changes (the actual refactor)

1. `tailwind.config.ts` — removed `prefix: 'e-'` line; comment `e-text-neutral-400` → `text-neutral-400`.
2. ~351 files under `app/` — boundary-aware codemod stripped `e-`/`-e-`/`!e-`/`!-e-` from class tokens
   (tsx/ts/css). 6957 + 39 replacements. Verified 0 residual `e-` class tokens.
3. `app/components/shared/utils.ts` — **the parity fix** (see Root cause):
    - `cn` = `clsx(inputs)` (NO tailwind-merge — preserves legacy "all classes kept, stylesheet-order wins").
    - `cnPrefixed` = `twMerge(clsx(inputs))` (was `extendTailwindMerge({prefix:'e-'})`; keeps dedup for its
      2 consumers `LoadingCard`/`ErrorCard`).

`git diff --shortstat` was ~353 files, ~3078/3079 line-balanced before the utils.ts fix.

## Root cause of drift (why a pure rename wasn't pixel-identical)

Removing the prefix re-activated two latent behaviors:

- **(A) PRIMARY — twMerge dedup switched on.** `cn()` used default `twMerge`, which did NOT recognize the
  `e-`-prefixed classes → kept all conflicting utilities (browser resolved by stylesheet order). Unprefixed,
  twMerge dedupes (keeps last) → app-wide restyle. Documented in old `utils.ts:13-16`. **Fixed** by making
  `cn = clsx` (proven equivalent to legacy no-op twMerge: `clsx('py-2.5','py-2')` = `'py-2.5 py-2'`).
- **(B) SECONDARY — bare unprefixed Tailwind classes** written without `e-` in source (e.g. `-mt-3` in
  `IdlCard.tsx:154`). Dead under the prefix (no CSS generated), now live. NOT yet addressed — this is the
  expected residual in the pending rediff. Fix per-case: remove the dead class (preserves parity; it did
  nothing before) unless inspection shows the author clearly intended it.

## Rig + data (all under `.claude/e-prefix-removal/`)

Scripts (copied from `.claude/dashkit-removal/`):

- `capture-2x.mjs <outDir> <idsFile>` — env `STORYBOOK_URL`; 2x DPR, reducedMotion + animation-freeze + 1500ms settle.
- `pixel-diff-all.mjs <baselineDir> <afterDir>` — pixelmatch (threshold 0.05, AA off), subtracts `flaky-allowlist.json`.
- `strip-prefix.mjs` — the codemod. `--dry` / `--tokens` / `--preview f1,f2` / `--apply`. Regex boundary set includes `!`.
- `.diff-tools/` — pngjs + pixelmatch deps. `flaky-allowlist.json` — 15 intrinsic flakes. `story-ids.json` — 989 ids.

Static builds (worktree root): `storybook-static-before/` (prefix), `storybook-static-after/` (no prefix + parity fix).

Screenshot sets:

- `before-2x/` — 989, prefix present (baseline).
- `after-2x/` — 989, prefix removed BUT BEFORE the utils.ts fix → **407 drift (twMerge dedup ON)**. Keep for reference.
- `after2-2x/` — 989, prefix removed + parity fix. **(capture in progress / just finished)**

## Serving (Python, no deps) — restart if servers died

```
python3 -m http.server 6200 --directory storybook-static-before --bind 127.0.0.1   # BEFORE
python3 -m http.server 6201 --directory storybook-static-after  --bind 127.0.0.1   # AFTER
```

Capture: `STORYBOOK_URL=http://127.0.0.1:6201 node .claude/e-prefix-removal/capture-2x.mjs .claude/e-prefix-removal/<out> .claude/e-prefix-removal/story-ids.json`

## STATUS: COMPLETE (2026-06-16) — 0 drift outside allowlists

`pixel-diff-all.mjs before-2x after2-2x` → compared 989, drift(excl flaky)=0, 2 inside allowlist (basecard
intentional doc-text). Full write-up + the 4 codemod-miss fixes are in `.claude/plans/remove-tailwind-e-prefix.md`
(the canonical /pdd plan now). Remaining: rig-scratch cleanup + review/commit (commit needs explicit ask).

## Open follow-ups / notes

- `cnPrefixed` name is now a misnomer (no prefix anymore) — optional rename in a later PR (kept for minimal churn).
- Build validates codemod syntax: both AFTER builds exited 0.
- Do NOT commit / push without explicit ask.
