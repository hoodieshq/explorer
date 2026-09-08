#!/usr/bin/env bash
# Decides whether a PR can move rendered pixels, i.e. whether the ~20 runner-minute Storybook
# visual-regression sweep earns its keep. Reads changed paths on stdin, prints `touched=true|false`
# on stdout in $GITHUB_OUTPUT format, and the matching paths on stderr for the run log.
set -uo pipefail

# Specs, mocks and test helpers render nothing, so they must not trigger a sweep on their own.
IGNORED='(^|/)(__tests__|__mocks__)/|\.spec\.tsx?$'
# Beyond components: Storybook config and the design tokens reach every story, packages/** feeds labels the
# stories render, and a slice's lib/model/api plus app/utils shape rendered text (domain names, parsed
# numbers, formatters) without holding a component. A `/ui/` clause would be dead weight — only 25 of 1250
# app files under a /ui/ slice are .ts, and the rest already match as .tsx.
RENDERED='^(app/.*\.(tsx|css|scss)|app/(entities|features)/[^/]+/(lib|model|api)/.*\.ts|app/(utils|shared)/.*\.ts|\.storybook/.*|packages/.*|(tailwind|postcss)\.config\.[cm]?[jt]s)$'

matched=$(grep -vE "$IGNORED" | grep -E "$RENDERED" || true)

if [ -n "$matched" ]; then
    echo 'touched=true'
    printf '%s\n' "$matched" >&2
else
    echo 'touched=false'
    echo 'no rendered-UI paths in the diff' >&2
fi
