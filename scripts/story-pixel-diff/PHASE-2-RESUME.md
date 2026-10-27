# Phase 2 — Dashkit Removal — Resume Notes

Snapshot of the work-in-progress dashkit removal Phase 2, captured so the session can pick up cleanly.

## Where things live

|                            | path                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------- |
| Worktree                   | `.worktrees/feat/remove-dashkit-phase-2/`                                                      |
| Branch                     | `feat/remove-dashkit-phase-2` (HEAD: last commit `fix(ui/Card): improve Card component`)       |
| Phase 1 (token foundation) | branch `feat/remove-dashkit` at `914a7e51` — already merged conceptually into Phase 2 worktree |
| Visual baseline            | `.claude/dashkit-removal/phase2-baseline/` (376 PNGs, captured at the post-slice-1 tip)        |
| Capture / diff scripts     | `.claude/dashkit-removal/{capture,pixel-diff-all,derive-flaky}.mjs`                            |
| Flaky allowlist            | `.claude/dashkit-removal/flaky-allowlist.json` (33 runtime-flaky stories)                      |

## Status — what's done

### Phase 1 (committed earlier)

- `tailwind.config.ts` carries the full `dk-*` token surface (colors, spacing, radius, shadow, fontSize) sourced from `app/scss/dashkit/_variables.scss` after `_solana-variables.scss` overrides. Light-theme entries are commented as unused-at-runtime per dark-only render.

### Phase 2 slice 1 (committed: `fix(ui/Card): improve Card component`)

- Unified `app/shared/ui/Card/BaseCard.tsx` with **`ui: 'dashkit' | 'tw'`** variant. Default `tw`. Context propagates `ui` to subcomponents.
- Subcomponents: `BaseCard`, `BaseCardHeader`, `BaseCardBody`, `BaseCardFooter`, `BaseCardTitle`, `BaseCardDescription`. Aliased exports: `Card`, `CardHeader`, `CardBody`/`CardContent`, `CardFooter`, `CardTitle`, `CardDescription`.
- `BaseCardSection` extracted from `interactive-idl/ui/InteractInstruction.tsx`.
- `BaseWarningCard` relocated from `interactive-idl/ui/` to `app/shared/ui/WarningCard/`.
- `CardWithTabs` left local to `InstructionActivity.tsx` per user's "Tabs is a localized feature" call.
- 4 IDL consumers updated to `import { Card } from '@/app/shared/ui/Card'`.

### Phase 2 slice 2 (NOT yet committed — uncommitted in worktree)

**Storybook coverage**
Stories added covering the simple/leaf components first, then provider-heavy ones via factories.

Storied this slice (~20 components, ~30 variants):

- `LoadingCard`, `EmptySecurityTxtCard`, `DeveloperResources`, `FeatureGateCard`
- `BlockhashesCard`, `SlotHashesCard`, `VotesCard`, `StakeHistoryCard`, `LookupTableEntriesCard`
- `BlockRewardsCard`, `BlockProgramsCard` (smoke), `BlockAccountsCard` (smoke)
- `HistoryCardComponents` (Header + Footer variants)
- `SupplyCard`, `StatsNotReady`, `LiveTransactionStatsCard`
- `TokenBalancesCard` (Inner export), `BaseInstructionCard`
- `TokenInstructionsCard`, `TokenTransfersCard`, `TransactionHistoryCard`

Convention: new story dirs are `__stories__/` (existing `stories/` dirs stay until renamed).

**Mock infrastructure**

- New decorators in `.storybook/decorators.tsx`: `withSupply`, `withStats`, `withMockTransactions`, `withHistory`.
- New mock providers in `.storybook/__mocks__/`: `MockSupplyProvider`, `MockStatsProvider`, `MockTransactionsProvider` (seeded entries via `status`/`parsed`/`raw` props), `MockHistoryProvider` (seeded entries via `history` prop).
- Factories in `.storybook/__mocks__/fixtures/`:
    - `transactions.ts` → `mockTransactionStatus`, `mockParsedTransactionDetails`, `mockRawTransactionDetails`
    - `account-history.ts` → `mockConfirmedSignatureInfo`, `mockAccountHistory`
- `react-moment` Storybook shim at `.storybook/__mocks__/react-moment.tsx`, aliased in `.storybook/main.ts` (sidesteps Vite/CJS interop crash with the real library).

**Source changes (to enable mocking)**

- Exported Contexts (typed `React.Context<Readonly<...>>`) from:
    - `app/providers/supply.tsx` (`StateContext`, `DispatchContext`, plus `State`/`Supply` types)
    - `app/providers/stats/solanaClusterStats.tsx` (`StatsProviderContext`, `DashboardContext`, `PerformanceContext`)
    - `app/providers/transactions/index.tsx` (`StateContext`, `DispatchContext`)
    - `app/providers/accounts/history.tsx` (`StateContext`, `DispatchContext`, `InFlightContext`; plus `AccountHistory`, `TransactionMap`, `FailedTransactionSignatures` types)

**Validation**

- Pixel diff: 0 drift outside the 33-story flaky allowlist on the 338 pre-existing stories (verified against `phase2-baseline`).
- `BaseCard` ui="dashkit" renders dashkit-faithful visuals; ui="tw" preserves existing OKLCH renders for the 4 IDL consumers.

## Recurring gotchas

- **`nextjsParameters` is required** on any story behind `ClusterProvider` (i.e. any decorator that uses cluster — `withCluster`, `withSupply`, `withStats`, `withMockTransactions`, `withHistory`, `withClusterAndAccounts`, `withTransactions`). Without it the story crashes with "invariant expected app router to be mounted".
- **`react-moment` only works via the Storybook shim.** Real react-moment crashes Vite's CJS interop. The shim approximates `fromNow` formatting; visual diff is reliable, exact strings may differ from production.
- When moving stories into `__stories__/` subfolder, **update the relative import** from `./Component` to `../Component`.
- Subcomponent `ui` variant inherits via React Context — `<BaseCard ui="dashkit">` is enough; children don't need explicit `ui`.

## Pending work (next session)

Tasks queue (live in `TaskList`):

- **#18 Convert 19 storied .card consumers to BaseCard with `ui="dashkit"`** (the original slice-2 goal — still pending; held while we built coverage).
- **#19 Add stories then convert ~45 unstoried .card consumers** (in progress — see remaining list below).
- **#20 Add Storybook mock providers** (in progress — still need richList, rewards, account-info-by-address, optionally accounts-tokens).

### Storyable next, using existing mocks

- `InspectorInstructionCard` (twin of BaseInstructionCard — same pattern)
- `ProgramLogSection` (seed `mockParsedTransactionDetails` for a signature)
- Inspector cards: `AccountsCard`, `AddressTableLookupsCard`, `SignaturesCard` (the last two need `VersionedMessage` fixtures — moderate weight)
- Account sections: `StakeAccountSection`, `UpgradeableLoaderAccountSection`, `VerifiedBuildCard`, `OwnedTokensCard`, `TokenExtensionsSection`, `TokenExtensionsCard`, `ProgramMultisigCard`, `AnchorAccountCard`, `MetaplexNFTAttributesCard`, `CompressedNFTInfoCard`, `AttestationDataCard`, `RewardsCard`
- Top-level / page-level adjacent: `TopAccountsCard`, `VerifiedProgramsCard`, `IdlCard`, `IdlInstructionSection`, `SimulationCard`
- Block: `BlockHistoryCard` (heavy — VersionedBlockResponse fixture, can start with empty smoke story)

### Needs new mock providers

- **richList** (`@providers/richList`) — for `TopAccountsCard`
- **rewards** (`@providers/accounts/rewards`) — for `RewardsCard`
- **accounts/tokens** seeded entries — for `OwnedTokensCard`, `TokenHistoryCard`, `TokenExtensionsCard`
- **scroll-anchor** — works with default Context fallback, no mock needed
- **Extend `MockAccountsProvider`** to accept seeded entries by address — for `AnchorAccountCard`, `AttestationDataCard`, `UpgradeableLoaderAccountSection`, `MetaplexNFTAttributesCard`, etc.

### Skipping (page-level — manual visual check during conversion)

- `app/page.tsx`, `app/block/[slot]/layout.tsx`, `app/tx/[signature]/page-client.tsx`, `app/epoch/[epoch]/page-client.tsx`, `app/feature-gates/page-client.tsx`, `app/utils/feature-gate/UpcomingFeatures.tsx`

## How to resume

1. `cd .worktrees/feat/remove-dashkit-phase-2` and `pnpm i --frozen-lockfile`.
2. Launch Storybook: `pnpm storybook` (port 6006).
3. From the main worktree, refresh story IDs:
    ```bash
    curl -s 'http://localhost:6006/index.json' | python3 -c "import sys,json; print(json.dumps([e['id'] for e in json.load(sys.stdin)['entries'].values() if e.get('type')=='story']))" > .claude/dashkit-removal/all-story-ids.json
    ```
4. Re-capture phase2-baseline once the in-progress stories are committed:
    ```bash
    node .claude/dashkit-removal/capture.mjs .claude/dashkit-removal/phase2-baseline
    ```
5. Verify clean state:
    ```bash
    node .claude/dashkit-removal/pixel-diff-all.mjs phase2-baseline after
    # expected: 0 drift outside flaky allowlist
    ```
6. Pick up the next batch from "Pending work" above.

## Phase 2 end-state (still goal)

After all `.card` consumers wrap in `<BaseCard ui="dashkit">` + subcomponents (with no visual drift outside the flaky allowlist), Phase 3 deletes `app/scss/dashkit/`, drops `bootstrap` from `package.json`, re-enables `@tailwind base`, strips `layout.min.css` from `.storybook/preview.tsx`.
