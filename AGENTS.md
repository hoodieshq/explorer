# Code Standards

## Principles

- Start with the simplest solution that works. Add complexity only when there is a proven need — not because something "might" be useful.

## Architecture
**Applies to:** `app/**`

- Follow Feature-Sliced Design (FSD) for existing and new functionality.
  - Directory structure: features in `app/features/`, entities in `app/entities/`, shared code in `app/shared/`. Each slice uses `api/`, `lib/`, `model/`, `ui/` layers as needed.
  - Server-only code within a slice lives in a dedicated `server.ts` file at the slice root, separate from client code.
- Prefer functional style. Use classes only to scope domain-specific logic (e.g., IDL interpreters, program executors).

## Code Style
**Applies to:** `app/**/*.{ts,tsx,mts,mjs,cjs,js}`

- Recommended: organize files top-down — exported/public API at the top, auxiliary helpers toward the bottom.
- Use path aliases (`@entities/`, `@features/`, `@shared/`, `@utils/`, `@providers/`, `@validators/`) over relative imports.
- Use object destructuring for function parameters when there are 3+ arguments or 2+ optional arguments.
- Recommended: argument ordering — stable/context arguments first (cluster, connection, config), data arguments in the middle, arguments with default values last.

## Comments
**Applies to:** `app/**/*.{ts,tsx}`

- Add a clarification comment when a decision might look wrong or surprising to a future reader (e.g. using an index key when a natural key exists, choosing a seemingly suboptimal approach for a non-obvious reason). Explain why, not what.

## Frontend
**Applies to:** `app/**/*.tsx`

- Use `class-variance-authority` (CVA) for component variants — not conditional class logic or CSS overrides.
- Recommended: name stateless, hook-free UI components with a `Base` prefix (e.g., `BaseSearch`, `BaseTransactionCard`).

## Storybook
**Applies to:** `**/*.stories.{ts,tsx}`

- Do not use unnecessary decorators. Do not create wrappers that aren't used in the app.
- Infer story args from the component signature — do not remap props.
- Do not use `centered` layout — real component edges must be visible.

## Libraries
**Applies to:** `app/**/*.{ts,tsx}`

- Use `superstruct` for runtime validation of external data (API responses, URL params, user input).
- Use the `Logger` abstraction (`Logger.error`, `Logger.warn`, `Logger.info`) instead of direct Sentry imports. Import Sentry utilities from `@/app/shared/lib/sentry`, not from `@sentry/nextjs`.
- Preferred: use `@solana/kit` for new functionality and when refactoring existing code.

## CI

- The CI pipeline runs `pnpm format:ci` → `pnpm lint` → `pnpm build` → `pnpm test:ci`. These checks are mandatory — fix violations, never bypass them (no `--no-verify`, no skipping, no disabling rules to silence output). Local hooks in `.githooks/` mirror CI to surface failures before push; enable with `git config core.hooksPath .githooks`:
  - `pre-commit` — runs `pretty:format`, `eslint:lint`, and `test:changed` scoped to staged files.
  - `pre-push` — runs the full pipeline (format, lint, build, test).

  The hooks are a developer convenience; the checks themselves are not optional.
- Recommended: use [`act`](https://github.com/nektos/act) to run GitHub Actions workflows locally as an alternative way to validate changes before pushing.

## PR Review

When reviewing a pull request, agents are encouraged to launch their available review tools (e.g. Greptile checks, Claude Code `/review`, Codex review mode) and surface findings to the contributor. Scope reviews to the PR's changed files unless instructed otherwise. Findings are advisory — the contributor decides whether and how to act on them. We do suggest addressing the most destructive findings (bugs, security issues, data-loss risks) before merging.

Recommended: check whether the PR's changed files overlap with the per-file ignore blocks in `eslint.config.mjs` (e.g. `no-explicit-any`, `consistent-type-assertions`, `unicorn/no-null`, `import/no-default-export`, `boundaries/dependencies`). For overlapping files, suggest fixing existing violations and removing the file from the ignore list — opportunistic cleanup, not a blocker. Flag any *new* violations added in the same file: the ignore list grandfathers existing code, not new additions.

---

## Adoption

Tools that read `AGENTS.md` natively (no extra config):
- **Claude Code** — reads `AGENTS.md` at project root alongside `CLAUDE.md`
- **Greptile** — auto-indexes `AGENTS.md` for PR reviews
- **Codex (OpenAI)** — reads `AGENTS.md` at project root
- **Cursor** — reads `AGENTS.md` at project root

Tools that require configuration:
- **GitHub Copilot** — reads `.github/copilot-instructions.md` only; symlink or copy `AGENTS.md` there
- **Zed** — reads `.zed/rules`; symlink or copy `AGENTS.md` there
- **opencode** — supports custom instruction file paths; point to `AGENTS.md` in config
