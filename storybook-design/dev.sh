#!/usr/bin/env bash
# Launch the design-prototype Storybook (the "storybook-design" slices).
#
# This replaces the former root package.json "design-sb" script so that no wiring for the
# design work lives outside this folder. The `storybook` binary is a project devDependency;
# the repo enforces pnpm as its package manager (see package.json devEngines), so use
# `pnpm exec` to run it. Run from anywhere:
#
#     ./storybook-design/dev.sh
#
# Static build (output to an ignored dir):
#     pnpm exec storybook build --config-dir storybook-design/.storybook -o storybook-design-static
set -euo pipefail

# Resolve the repo root (parent of this script's folder) so it works from any CWD.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

exec pnpm exec storybook dev -p 6007 --config-dir storybook-design/.storybook "$@"
