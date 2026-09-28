# Extract the transaction version seam into `@explorer/parsers/transaction`

## Context

Transaction v1 (SIMD-0385 format, SIMD-0296 size) is live on mainnet. It differs from legacy and v0 in four
ways, and each one cuts across the app:

- resource limits move out of Compute Budget instructions and into message config
- the priority fee is a total in lamports, not a price per compute unit
- address lookup tables are gone
- the size limit rises to 4096 bytes, and the envelope drops its signature-count byte

Five places work those facts out on their own today: `app/shared/lib/v1-message-bridge.ts`,
`app/features/transaction/ui/SummaryCard.tsx` (five branches), `app/components/inspector/InspectorPage.tsx`
(its own copy of the size maths and the config rows), `app/entities/compute-unit/lib/compute-units-schedule.ts`,
and `packages/entity-inspector`, which has no v1 arm at all and throws on every v1 signature.

Three `TransactionVersion` types are in play and no two agree: kit's covers v1, web3.js stops at v0, and
`packages/entity-inspector` declares its own as `'legacy' | 0 | null`.

## Why

Every copy is a chance to get v1 wrong in a way that still renders. Two are wrong today. MCP `inspect_entity`
fails on every v1 signature. CU profiling applies the pre-v1 per-instruction reserve to transactions that have
no per-instruction budget.

Alternatives considered:

- **Fix each consumer in place.** This is the state we are in, and it is what produced the scatter. Rejected.
- **Export version facts only, with no shared transaction type.** Rejected. It removes duplicated branches,
  but every consumer still holds a different object, so "a transaction, any version" is still not a value you
  can hand to anything.
- **Keep the compute-unit estimators in the app, reaching the package through a dependency-injection port.**
  Rejected once the reserve schedule was read. It is a feature gate activation table plus per-program reserves
  quoted from Agave, with no app state in it. Moving the table removes the need for a port, collapses the two
  estimators into one, and lets MCP report requested compute units honestly instead of through a stub that
  returns zero.
- **Reimplement kit's instruction and account normalisation.** Rejected. `@solana/transaction-introspection`
  already covers legacy, v0 and v1 with typed errors, and `@solana/kit` re-exports it.

The split that survives is shape against rules. The package owns what the bytes can answer. The entities own
what needs cluster, epoch or fee constants. The app and the MCP package share the package half, which is the
wider parsers-unification goal.

## What Changes

- New subpath `@explorer/parsers/transaction`. It carries a `ParsedTransaction` union over legacy, v0 and v1,
  one constructor per input (`fromRpcTransaction` for any encoding, `fromCompiledMessage` and
  `fromMessageBytes` for decoded input), and helpers that take no version argument: `transactionSizeLimit`,
  `transactionWireSize`, `getTransactionConfig`, `getAddressTableLookups`, `isV1MessageBytes` and
  `UnsupportedTransactionVersionError`. The account resolver and the message integrity checks move here from
  `entity-inspector`.
- New subpath `@explorer/parsers/programs/compute-budget`. It takes the feature gate reserve schedule, the
  per-program defaults and the Compute Budget instruction reader. The two estimators collapse into one
  `getRequestedComputeUnits`, which also reports where its number came from.
- `app/entities/compute-unit` keeps the UI work (log pairing, block summary, profiling card) and stops
  inventing a per-instruction reserve for v1. `transaction-fee` owns the declared against derived priority
  fee, which needs a fee constant the explorer already holds.
- Features and components call entity and package helpers. No `version === 1` literals remain under
  `app/features/transaction` or `app/components/inspector`. Cards render on data presence.

## Impact

- `packages/parsers` gains two subpaths. The package gates (agadoo, node-esm, coverage) apply unchanged.
- `packages/entity-inspector` deletes its local `TransactionVersion`, its account resolver and
  `selectAccountResolver`. It keeps the probe half of its normalizer: status, fee, confirmations. Legacy and
  v0 MCP payloads must stay byte-identical, proven by snapshots taken before the switch.
- `app/shared/lib/v1-message-bridge.ts` loses its constants, its byte sniff and its config reader. The web3.js
  view classes stay until the inspector is kit-native.
- Accepted risk: the package declares RPC response shapes, so an RPC output change becomes a package change.
  In exchange the base58 decode, the header renames and the index checks exist once instead of three times.
- Accepted risk: the compute unit feature gate table now updates through a package build, not an app edit.
