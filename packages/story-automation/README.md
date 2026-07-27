# @explorer/story-automation

Storybook screenshot capture and pixel-diff CLI, extracted from the dashkit-removal campaign rig. It backs the
advisory `Storybook-Visual-Regression` CI job and remains usable for local parity sweeps.

## Commands

```sh
story-automation story-ids (--static-dir <dir> | --url <url>)
story-automation capture (--static-dir <dir> | --url <url>) --out <dir> [--ids <file>] [--parallel <n>]
story-automation diff --baseline <dir> --current <dir> [--triplets <dir>] [--allowlist <file>]... [--include-flaky] [--summary-md] [--merge-base <sha>]
story-automation chromium-revision
```

- `story-ids` reads the story list from the Storybook `index.json` (docs entries excluded). No more hand-maintained
  `all-story-ids.json`.
- `capture` screenshots every story at 1024×768 / 2x DPR with `reducedMotion: 'reduce'`, a 1500ms settle for async
  stories, and a CSS animation/transition freeze before the shot (reducedMotion alone doesn't stop `animate-spin`).
  `--static-dir` serves the build in-process; `--url` points at an already-running Storybook. Exits non-zero when
  more than 10% of captures fail (wholesale-broken build guard).
- `diff` pixel-compares two capture dirs (`pixelmatch`, threshold 0.05, AA off). Stories present on only one side
  are reported as new/removed info, never as drift. Non-allowlisted drifted stories get
  `{id}.baseline/.current/.diff` PNG triplets written to `--triplets`. Exits 1 iff drift outside the allowlists
  exists. `--summary-md` prints a markdown report on stdout (for `$GITHUB_STEP_SUMMARY`) and the plain report on
  stderr.
- `chromium-revision` prints the chromium build revision bundled with the installed playwright — the CI baseline
  cache key input (the browser build, not the playwright package version, determines rendered pixels).

## Local sweep recipe

```sh
pnpm build:packages && pnpm build-sb
pnpm exec story-automation capture --static-dir storybook-static --out /path/to/before --parallel 6
# ...apply your change, rebuild storybook...
pnpm exec story-automation capture --static-dir storybook-static --out /path/to/after --parallel 6
pnpm exec story-automation diff --baseline /path/to/before --current /path/to/after \
    --allowlist packages/story-automation/allowlists/flaky.json \
    --allowlist packages/story-automation/allowlists/intentional.json \
    --triplets /path/to/triplets
```

Conventions carried over from the campaigns:

- **Both sides must match in Storybook mode and `.env.local`** (dev:dev or static:static; env flags flip stories
  like View-Receipt/IDL-Interact). Never diff a dev capture against a static one.
- **Slices**: for fast iteration, pass a separate JSON id array via `--ids`; never trim the canonical set.
- **Flakiness is proven, not assumed**: before adding an id to `allowlists/flaky.json`, run a same-build A/B
  capture (capture the same static build twice, diff) — only stories drifting against themselves are flaky.
- **Any capture-semantics change invalidates all baselines** (viewport, settle time, freeze CSS): bump the `v1`
  salt in the CI cache key and re-dispatch the baseline workflow.

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
