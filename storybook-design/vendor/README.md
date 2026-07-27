# vendor/

Copies of app components that the design slices modify. Paths mirror `app/` (`vendor/components/inspector/AccountsCard.tsx` ↔ `app/components/inspector/AccountsCard.tsx`), so a finished slice can be replayed onto the app as a plain file-by-file diff.

The point is that a prototype touches nothing outside `storybook-design/`: `app/` stays at its upstream state while the slice iterates.

## Conventions

1. Only vendor a file you actually changed. Everything else is imported from the app through the usual aliases (`@components/…`, `@features/…`, `@/app/…`), so the prototype keeps drifting along with the real code.
2. Inside a vendor file, imports of other vendored files are relative (`../../shared/ui/page-container/PageContainer`); imports of untouched app files use aliases. A relative sibling import that is _not_ vendored has to be rewritten to an absolute app path — otherwise it silently resolves inside `vendor/`.
3. A change that upstream would live in a barrel or a shared module (e.g. `DENSE_ROW_PADDING`, which belongs next to `BaseTable`) gets its own vendor module rather than a copy of the whole file.
4. `eslint.config.mjs` exempts specific `app/**` paths from `unicorn/no-null`, `no-explicit-any` and `consistent-type-assertions`. Those globs don't match `storybook-design/`, so a vendored file re-declares the exemption in a file-level `eslint-disable` header naming its origin.
5. Slices import the vendor copy, never the app original — otherwise the story renders the unmodified component.

## Current contents (tx-inspector slice)

| vendored | why |
| --- | --- |
| `components/inspector/{InspectorPage,AccountsCard,SignaturesCard,AddressWithContext,AddressTableLookupsCard,InstructionsSection}.tsx` | the inspector layout rework |
| `components/ProgramLogsCardBody.tsx` | `className` passthrough to the table body |
| `entities/compute-unit/ui/CUProfilingCard.tsx` | `headerless` mode |
| `features/instruction-simulation/ui/{SimulationCard,SimulatorCUProfilingCard,SolBalanceChangesCard}.tsx` | section headers outside the card, mobile grid |
| `features/instruction-simulation/mocks/` | captured mainnet simulation replayed by the `Done` story |
| `shared/ui/page-container/PageContainer.tsx` | `width="fluid"` variant |
| `shared/ui/Table/dense-row-padding.ts` | `DENSE_ROW_PADDING` (upstream: next to `BaseTable`) |
