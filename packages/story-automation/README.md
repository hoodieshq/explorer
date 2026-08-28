# @explorer/story-automation

Storybook screenshot capture and pixel-diff CLI, extracted from the dashkit-removal campaign rig. It backs the
advisory `Storybook-Visual-Regression` CI job and remains usable for local parity sweeps.

## Commands

```sh
story-automation story-ids (--static-dir <dir> | --url <url>)
story-automation capture (--static-dir <dir> | --url <url>) --out <dir> [--ids <file>] [--parallel <n>] [--browser <chromium|firefox|webkit>]
story-automation diff --baseline <dir> --current <dir> [--triplets <dir>] [--allowlist <file>]... [--include-flaky] [--summary-md] [--merge-base <sha>]
story-automation browser-revision [--browser <chromium|firefox|webkit>]
story-automation chromium-revision
```

- `story-ids` reads the story list from the Storybook `index.json` (docs entries excluded). No more hand-maintained
  `all-story-ids.json`.
- `capture` screenshots every story at 1024×768 / 2x DPR with `reducedMotion: 'reduce'`, a 1500ms settle floor
  followed by a wait for the DOM to go 400ms quiet (capped at 6s), and a CSS animation/transition freeze before the
  shot (reducedMotion alone doesn't stop `animate-spin`). The floor alone raced CPU contention: at `--parallel 6`
  a suspense fallback could still be on screen at 1500ms and diff as drift, while the same story was stable at
  `--parallel 1`. Each worker gets its own browser context, wiped between stories, because every story shares the
  Storybook origin and localStorage written by one otherwise reaches whichever story a worker picks up next.
  `--static-dir` serves the build in-process; `--url` points at an already-running Storybook. Exits non-zero when
  more than 10% of captures fail, or when more than 10% render nothing at all (both mean the build is broken
  wholesale, and blank shots diff cleanly against each other).
- `--browser` picks the engine through a `BrowserProvider`; `playwrightProvider(engine)` is the only implementation
  today and browsers must be installed (`playwright install firefox`). Pixels are engine-specific, so a baseline is
  only comparable to a capture from the same engine and revision — a non-chromium lane needs its own cache key.
- `diff` pixel-compares two capture dirs (`pixelmatch`, threshold 0.05, AA off). Stories present on only one side
  are reported as new/removed info, never as drift. Non-allowlisted drifted stories get
  `{id}.baseline/.current/.diff` PNG triplets written to `--triplets`; a story present only in `--current` has
  nothing to diff against, so its one side is kept there as `{id}.new.png`, while baseline-only stories keep
  nothing. Exits 1 iff drift outside the allowlists exists. `--summary-md` prints a markdown report on stdout (for `$GITHUB_STEP_SUMMARY`) and the plain report on
  stderr.
- `browser-revision` prints one engine's build revision bundled with the installed playwright — the CI baseline
  cache key input (the browser build, not the playwright package version, determines rendered pixels).
  `chromium-revision` is the chromium-only shorthand the CI key uses.

## Local sweep recipe

```sh
pnpm capture-sb --out /path/to/before
# ...apply your change...
pnpm capture-sb --out /path/to/after
pnpm diff-sb --baseline /path/to/before --current /path/to/after --triplets /path/to/triplets
```

`precapture-sb` runs `build:packages` and `build-sb` before every capture, so a side can never be shot against a
stale or half-built `storybook-static`. `diff-sb` carries both allowlists. Extra CLI flags pass straight through
(`--browser`, `--ids`, `--parallel`, `--include-flaky`, …).

Conventions carried over from the campaigns:

- **Both sides must match in Storybook mode and `.env.local`** (dev:dev or static:static; env flags flip stories
  like View-Receipt/IDL-Interact). Never diff a dev capture against a static one.
- **Slices**: for fast iteration, pass a separate JSON id array via `--ids`; never trim the canonical set.
- **Flakiness is proven, not assumed**: before adding an id to `allowlists/flaky.json`, run a same-build A/B
  capture (capture the same static build twice, diff) — only stories drifting against themselves are flaky.
- **Any capture-semantics change invalidates all baselines** (viewport, settle rules, freeze CSS, context
  isolation): bump the `v2` salt in the CI cache key and re-dispatch the baseline workflow.

## CI model

- The **baseline** is captured from master by the manually dispatched `storybook-vr-baseline` workflow and stored
  in the GitHub Actions cache (key: salt + runner `ImageOS` + chromium revision + master sha). It is disposable by
  design; nothing binary is committed. Re-dispatch after notable UI merges, allowlist changes, or cache eviction.
- The **PR job** restores the newest environment-matching baseline (exact merge-base hit is unlikely and not
  required — the report names the baseline commit and flags approximate comparisons), captures the PR side, diffs,
  and uploads drift triplets as an artifact. It is advisory (`continue-on-error`) and skips with a notice when no
  baseline exists for the current environment.
- `allowlists/intentional.json` entries are temporary: once the approved change merges and the baseline is
  re-dispatched, remove them.
