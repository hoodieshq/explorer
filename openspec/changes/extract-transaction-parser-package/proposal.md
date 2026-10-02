# Extract the transaction version seam into `@explorer/parsers/transaction`

## Context

Transaction v1 (SIMD-0385 format, SIMD-0296 size) is live on mainnet. It differs from legacy and v0 in four ways:

- resource limits move out of Compute Budget instructions and into message config
- the priority fee is a total in lamports, not a price per compute unit
- address lookup tables are gone
- the size limit rises to 4096 bytes, and the envelope drops its signature-count byte

There is no single place which holds the rules that differ between transaction versions, so some parts of the
app either work them out on their own or do not support v1 transactions.

## Why

Solana has three transaction versions, and each one has different rules for size, compute budget and fees.
The proposed package works with a transaction of any version, provides one shape and applies those rules in
one place, so the rest of the app can use it.
Support for another possible version is then added once to the package, instead of in every screen that shows
a transaction.

Alternatives considered:

- **Fix each consumer in place.** This is the state we are in, and it is what produced the scatter. Rejected.
- **Export version facts only, with no shared transaction type.** Rejected. It removes duplicated branches,
  but every consumer still holds a different object.
- **A factory that returns one Tx class per version, with methods such as `tx.sizeLimit()`.** Rejected. Most
  size and config callers hold bytes or a compiled message, not a transaction, so the free functions must exist
  anyway and every rule would ship twice. The cluster and epoch exist only at render time, so a method that
  needs them takes the same arguments as the free function. A bundler cannot drop unused methods, so a page
  that only checks size would also load the compute unit code. `withNumbersInsteadOfBigInts` rebuilds objects
  and would drop the methods without a type error.


## What Changes

- New subpath `@explorer/parsers/transaction`. It carries a `ParsedTransaction` union over legacy, v0 and v1,
  one constructor per input (`fromRpcTransaction` for any encoding, `fromCompiledMessage` and
  `fromMessageBytes` for decoded input), and helpers that take no version argument: `transactionSizeLimit`,
  `transactionWireSize`, `getTransactionConfig`, `getAddressTableLookups`, `hasUnmatchedLookupTables`,
  `isV1MessageBytes` and `UnsupportedTransactionVersionError`.
- New subpath `@explorer/parsers/programs/compute-budget`. It takes the feature gate reserve schedule, the
  per-program defaults and the Compute Budget instruction reader. The two estimators collapse into one
  `getRequestedComputeUnits`, which also reports where its number came from.
- `app/entities/compute-unit` keeps the UI work (log pairing, block summary, profiling card) and stops
  inventing a per-instruction reserve for v1.
- The package owns the priority fee: the total a v1 message declares, or the one derived from the RPC fee for
  legacy and v0. `transaction-fee` re-exports it and drops its own copy.
- Features and components call entity and package helpers. No `version === 1` literals remain under
  `app/features/transaction` or `app/components/inspector`. Cards render on data presence.

## Impact

- `packages/parsers` gains two subpaths. The package gates (agadoo, node-esm, coverage) apply unchanged.
- `packages/entity-inspector` deletes its local `TransactionVersion`, its account resolver and
  `selectAccountResolver`. Legacy and v0 MCP payloads must stay byte-identical, proven by snapshots taken
  before the switch.
- `app/shared/lib/v1-message-bridge.ts` loses its constants, its byte sniff and its config reader. The web3.js
  view classes stay until the inspector is kit-native.
- Accepted risk: the package declares RPC response shapes, so an RPC output change becomes a package change.
- Accepted risk: the compute unit feature gate table now updates through a package build, not an app edit.
