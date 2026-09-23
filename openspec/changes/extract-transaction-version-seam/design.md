# Design: `@explorer/parsers/transaction`

The package provides one set of functions that work on any transaction, legacy, v0 or v1. It keeps the version
differences inside. Callers pass a transaction and get the result, without needing to know tx version.

## What kit already provides

Checked against `@solana/kit` 8.3.0, the version installed here.

| Need | kit | does the package uses kit fn? |
| --- | --- | --- |
| Instruction normalisation across legacy, v0, v1 | `getInstructionsFromCompiledTransactionMessage` | yes |
| Account resolution from a compiled message, ALTs included | `getAccountMetasFromCompiledTransactionMessage` | yes |
| Inner instructions, instruction walking | `getInnerInstructionsFromMeta`, `walkInstructions` | not here, they read `meta` |
| v1 config mask predicates | `transactionConfigMaskHas*` | yes |
| Version ceiling for RPC calls | `MAX_SUPPORTED_TRANSACTION_VERSION` | yes, at the app's call sites |
| Size of a decoded kit transaction | `getTransactionSize` | not here, it needs a kit `Transaction` |
| Config value decoding | `decompileTransactionConfig` is internal | no, port (kit has it but doesnt export) |
| Size limit by version | `getTransactionSizeLimit` takes a kit `Transaction`, which the union never holds | no, write it |
| Envelope size from message bytes alone | none | no, write it |
| Cross-version priority fee | `getTransactionMessagePriorityFeeLamports` is v1 only, `getTransactionMessageComputeUnitPrice` is legacy and v0 only | no, write it |
| Per-account `source` attribution for MCP payloads | `AccountMeta` has no field for it | no, write it |
| One transaction value across all versions | none | no, write it |

The package implements the "no" rows.

## The ParsedTransaction and versions union

Knows what an RPC returns, declared structurally. Makes no RPC calls, carries no web3.js or cluster config.

```ts
export type TransactionVersion = 'legacy' | 0 | 1;

/** What an RPC reports before a message is decoded. `null` means the caller omitted the version ceiling. */
export type ReportedTransactionVersion = TransactionVersion | null;

export type TransactionAccount = {
    address: Address;
    signer: boolean;
    writable: boolean;
    source: 'static' | 'lookupTable';
    /** The lookup table this address came from, when the encoding reports it. v0 only. */
    lookupTableAddress?: Address;
};

export type TransactionInstruction = {
    programAddress: Address;
    accounts: readonly TransactionAccount[];
    /** Absent when the RPC sent a parsed instruction instead of its data. */
    data?: Uint8Array;
    /** The RPC's own decode, under `jsonParsed` encoding only. */
    parsed?: unknown;
};

export type TransactionConfig = {
    computeUnitLimit?: number;
    heapSize?: number;
    loadedAccountsDataSizeLimit?: number;
    /** A total, in lamports. Legacy and v0 have no equivalent: they price per compute unit. */
    priorityFeeLamports?: bigint;
};

type TransactionBase = {
    accounts: readonly TransactionAccount[];
    instructions: readonly TransactionInstruction[];
    lifetimeToken: string;
    numSignerAccounts: number;
    signatures: readonly (string | undefined)[];
};

export type ParsedTransaction =
    | (TransactionBase & { version: 'legacy' })
    | (TransactionBase & { version: 0; addressTableLookups?: readonly AddressTableLookup[] })
    | (TransactionBase & { version: 1; config?: TransactionConfig });
```

- Accounts and instructions sit in the base, because every version has them.
- `addressTableLookups` sits on the v0 arm alone.
- v1 removed lookup tables and legacy tx never had them.
- `addressTableLookups` is optional because `jsonParsed` never names the tables: `undefined` means the
  encoding did not report them, `[]` means there are none.
- `config` sits on the v1 and is optional, because a tx may set no limits at all.
- `TransactionConfig` repeats kit's `V1TransactionConfig` field for field, under a name the union can use on
  any version. kit does export that type, so the comment in `v1-message-bridge.ts` saying otherwise is stale.

The union does not carry `meta`. Balances, inner instructions, consumed compute units and the fee are
execution results. They have the same shape on every version, so they stay on `BlockTransaction.meta` and
`RawTransaction.meta`.

## Constructing ParsedTransaction from rpc/message/bytes

This codebase has two inputs: a decoded message, and an RPC response. Both produce the same value. Neither
takes a version, because each one can work it out.

```ts
/** Wire path: block pages, the inspector, the raw transaction fetch. The version comes off the message. */
export function fromCompiledMessage(
    message: CompiledTransactionMessage,
    options?: { loadedAddresses?: LoadedAddresses; signatures?: readonly (string | undefined)[] },
): ParsedTransaction;

/** Bytes path: decodes, then delegates. Rejects trailing bytes, so a wire transaction cannot pass as a message. */
export function fromMessageBytes(bytes: Uint8Array, options?: FromMessageOptions): ParsedTransaction;

/**
 * RPC path: one entry point for every encoding.
 *
 * Detects which encoding arrived the way kit's `decodeTransactionFromRpcResponse` does. `base64` and `base58`
 * carry wire bytes. `json` carries the compiled header. `jsonParsed` carries neither, and sends accounts with
 * their roles already resolved.
 */
export function fromRpcTransaction(response: RpcTransactionResponse): ParsedTransaction;
```

Consumers pass what the RPC gave them. The base58 instruction decode, the header field renames
(`numReadonlyUnsignedAccounts` against `numReadonlySignerAccounts`) and the `source: 'transaction'` to
`'static'` mapping all happen inside the package, once instead of once per consumer.

```ts
/**
 * The part of a `getTransaction` or `getBlock` transaction entry the union needs.
 *
 * Declared structurally, not derived from kit's overloaded `GetTransactionApi`. That type resolves to
 * whichever overload is declared last, whatever encoding was requested, which is why
 * `app/entities/transaction-data/lib/adapt-parsed-transaction.ts` declares its own too. Numeric fields accept
 * `number | bigint`, because kit sends bigint only where its integer allow-list declares it, and `version`
 * is not on that list.
 */
export type RpcTransactionResponse = {
    meta?: {
        loadedAddresses?: { readonly: readonly string[]; writable: readonly string[] } | null;
    } | null;
    transaction: RpcWireTransaction | RpcJsonTransaction | RpcJsonParsedTransaction;
    version?: ReportedTransactionVersion | bigint;
};

/**
 * `encoding: 'base64' | 'base58'`. A `[data, encoding]` pair holding the full wire transaction, not a bare
 * message, so it is decoded with kit's transaction decoder and its `messageBytes` and signatures go to
 * `fromCompiledMessage`.
 */
type RpcWireTransaction = readonly [string, 'base58' | 'base64'];

/** `encoding: 'json'`. The compiled message, with a header and instructions addressed by index. */
type RpcJsonTransaction = {
    message: {
        accountKeys: readonly string[];
        addressTableLookups?: readonly AddressTableLookup[];
        header: {
            numReadonlySignedAccounts: number;
            numReadonlyUnsignedAccounts: number;
            numRequiredSignatures: number;
        };
        instructions: readonly { accounts: readonly number[]; data: string; programIdIndex: number }[];
        recentBlockhash: string;
        transactionConfig?: RpcTransactionConfig;
    };
    signatures: readonly string[];
};

/** `encoding: 'jsonParsed'`. No header. The RPC resolved every account role and may have decoded the data. */
type RpcJsonParsedTransaction = {
    message: {
        accountKeys: readonly {
            pubkey: string;
            signer: boolean;
            source: 'lookupTable' | 'transaction';
            writable: boolean;
        }[];
        instructions: readonly (
            | { accounts: readonly string[]; data: string; programId: string }
            | { parsed: unknown; program: string; programId: string }
        )[];
        recentBlockhash: string;
        transactionConfig?: RpcTransactionConfig;
    };
    signatures: readonly string[];
};
```

`fromRpcTransaction` throws `UnsupportedTransactionVersionError` on a `null` or unknown version. A value that
cannot say what it is has no place in the union.

It also checks what it reads: a header whose counts exceed the account list, an instruction index out of
range. Malformed RPC data then fails at the seam instead of rendering as wrong data. Those checks exist today
only in `packages/entity-inspector/src/transactions/normalizer.ts`.

`lookupTableAddress` is optional because only `json` and `base64` name the table an address came from, while `jsonParsed` reports that it came from one but not which.

### What happens to the MCP normalizer

`normalizeTransactionProbe` does two jobs today. Only the first one moves.

| Job | Where it goes |
| --- | --- |
| Static keys, header checks, version normalisation, account resolution, instruction index checks, blockhash | `fromRpcTransaction` |
| Slot, block time, fee, consumed CUs, log messages, confirmation status, error shape, status arm | stays put |

The second half is payload work: signature statuses, `SafeNumeric` coercion, the status arm. None of it
differs by version, so it stays and composes:

```ts
const transaction = fromRpcTransaction(envelope);
// ...then the status, fee and confirmation work it already does, unchanged.
```

`selectAccountResolver` is deleted. `resolveStaticAccounts` and `resolveV0Accounts` become private, and
`fromRpcTransaction` picks between them internally. We move the tests, including `kit-parity.spec.ts`,
which checks both against kit's `decompileTransactionMessage` and proves the move changes nothing.

The resolver sets `lookupCountsMismatch: boolean` when the lookup counts do not cover `loadedAddresses`. The package returns that flag on the transaction instead of logging it, because it has no logger. MCP keeps its warning, and other consumers choose for themselves.

## Usage

**MCP, `json` encoding.** In `packages/entity-inspector/src/transactions/normalizer.ts`. Replaces the local
`TransactionVersion`, the `selectAccountResolver` call, the index checks and the throw on v1.

```ts
const transaction = fromRpcTransaction(probe);

// The normalizer's context, not the payload. `build-payload.ts` still maps this into the wire shapes
// (`program_id`, base58 `data`, `inner_instructions`) that the byte-identical rule pins.
return {
    accountKeys: transaction.accounts.map(account => account.address),
    config: getTransactionConfig(transaction),
    instructions: transaction.instructions,
    resolvedAccounts: transaction.accounts,
    version: transaction.version,
};
```

**Transaction detail page, `jsonParsed`.** In `app/entities/transaction-data/lib/adapt-parsed-transaction.ts`.
This is where the config kit already types on the response stops being thrown away.

```ts
const transaction = fromRpcTransaction(response);
```

**Block page, `base64`.** In `app/entities/block-data/api/fetch-block.ts`, which today sniffs `0x81` and
bridges.

```ts
const transaction = fromRpcTransaction(rpcTransaction);
```

**Inspector, pasted bytes.** The one caller that starts from bytes rather than a response.

```ts
const transaction = fromMessageBytes(pastedBytes);
```

**Components.** Nothing left to branch on.

```tsx
const requested = getRequestedComputeUnits(transaction, { cluster, epoch });
const config = getTransactionConfig(transaction);

<Row label="Serialized size">
    {wireSize} / {transactionSizeLimit(transaction)} bytes
</Row>
<Row label="Compute units">
    {consumed} / {requested.value}
</Row>
{config !== undefined && <TransactionConfigCard config={config} />}
{getAddressTableLookups(transaction).length > 0 && <AddressTableLookupsCard transaction={transaction} />}
```

## Helpers

No helper takes a version. Each one works it out from the value, the message or the bytes.

```ts
/** 1232 for legacy and v0, 4096 for v1. */
export function transactionSizeLimit(source: ParsedTransaction | CompiledTransactionMessage | Uint8Array): number;

/** The v1 envelope has no signature-count byte. The count is read from the message header instead. */
export function transactionWireSize(messageBytes: Uint8Array): number;

/** `undefined` on every version that cannot carry config, so callers render on presence, not on version. */
export function getTransactionConfig(transaction: ParsedTransaction): TransactionConfig | undefined;

/**
 * Empty for legacy and v1, so an address lookups card can render on length alone.
 * Also empty for a v0 transaction read from `jsonParsed`.
 */
export function getAddressTableLookups(transaction: ParsedTransaction): readonly AddressTableLookup[];

export function isV1MessageBytes(bytes: Uint8Array): boolean;

export class UnsupportedTransactionVersionError extends Error {
    readonly version: unknown;
}
```

### Reading the TransactionConfig

Kit exports the mask predicates but not the value codec, hence the package owns this decoding.

```ts
// Mask bit order is the value order on the wire.
const CONFIG_FIELDS = [
    ['priorityFeeLamports', 'u64', transactionConfigMaskHasPriorityFee],
    ['computeUnitLimit', 'u32', transactionConfigMaskHasComputeUnitLimit],
    ['loadedAccountsDataSizeLimit', 'u32', transactionConfigMaskHasLoadedAccountsDataSizeLimit],
    ['heapSize', 'u32', transactionConfigMaskHasHeapSize],
] as const;

/**
 * Returns `undefined` for a message that sets no limits, and for malformed input.
 *
 * Deliberately not kit's `decompileTransactionMessage`, which throws on an out-of-range account index and
 * costs a full message decompile per call.
 */
function readTransactionConfig(message: V1CompiledMessage): TransactionConfig | undefined {
    const config: TransactionConfig = {};
    let valueIndex = 0;

    for (const [field, kind, maskHasField] of CONFIG_FIELDS) {
        let present: boolean;
        try {
            // The priority-fee predicate throws when only one of its two mask bits is set.
            present = maskHasField(message.configMask);
        } catch {
            return undefined;
        }
        if (!present) continue;

        const value = message.configValues[valueIndex++];
        if (value?.kind !== kind) return undefined;
        Object.assign(config, { [field]: value.value });
    }

    return valueIndex > 0 ? config : undefined;
}
```

The RPC sends the same four limits under different names, and marks them nullable rather than optional. One
adapter covers that.

```ts
export type RpcTransactionConfig = {
    computeUnitLimit: number | null;
    heapSize: number | null;
    loadedAccountsDataSizeLimit: number | null;
    priorityFee: bigint | null;
};
```

## Compute budget

The compute unit reserve schedule is chain knowledge. It is a table of feature gate activation epochs per cluster, plus per-program reserves quoted from Agave.

Moving these from `app/entities/compute-unit/lib/` to `@explorer/parsers/programs/compute-budget`:

```ts
/** The cluster names the schedule is keyed by. Matches the union `@explorer/entity-inspector` already has. */
export type SupportedCluster = 'custom' | 'devnet' | 'mainnet-beta' | 'testnet';

/** Reads a Compute Budget instruction's requested limit. `undefined` for any other program. */
export function readComputeUnitLimitFromInstruction(instruction: TransactionInstruction): number | undefined;

/** The per-program reserve at a given epoch, from the feature gate activation table. */
export function getReservedComputeUnits(args: {
    cluster: SupportedCluster;
    epoch?: bigint;
    programAddress: Address;
}): number;

/** Per-program execution defaults, quoted from Agave. */
export function getDefaultComputeUnits(programAddress: Address): number;
```

And in `./transaction`, because its subject is the transaction:

```ts
export function getRequestedComputeUnits(
    transaction: ParsedTransaction,
    context: { cluster: SupportedCluster; epoch: bigint | undefined },
): { value: number; source: 'declared' | 'fallback' | 'calculated' };
```

This one function replaces both estimators and `extractComputeUnitsFromInstruction`. Two shapes become one.

The estimators go in two stages. The app keeps `estimateRequestedComputeUnits` and
`estimateRequestedComputeUnitsForParsedTransaction` at first, with the same signatures and the same results,
but their bodies call the package. Their callers hold web3.js transactions and cannot build a
`ParsedTransaction` yet. Once they can, they call `getRequestedComputeUnits` directly and both estimators go.
Their tests do not change while this happens, which is how we know the numbers did not move.

`source` keeps the requested CU number origins:
- v1 with `config.computeUnitLimit` - `declared`.
- legacy/v0 with `SetComputeUnitLimit` ix - `declared`.
- v1 with no config - `fallback` (to 0).
- legacy/v0 with no limit instruction - `calculated`.

Two signature changes come with this:
The web3.js `PublicKey` and `ComputeBudgetProgram` parameters become a kit `Address`.
The app's `Cluster` enum from `@utils/cluster` becomes the string union above, mapped once at the app boundary.

### What stays in `app/entities/compute-unit`

- `formatInstructionLogs`. It pairs instruction rows with parsed log rows and shapes `InstructionCUData` for a card. That is UI work, and it carries misalignment reporting that belongs to the app's logger.
- `summarizeBlockComputeUnits`. It aggregates over a block's `meta`, which the union leaves out.
- The CU profiling card and its types.

The move also fixes a bug in `formatInstructionLogs`. v1 has no per-instruction reserve, so `scheduledUnits` is absent for a v1 transaction instead of being invented from the pre-v1 schedule.

### Priority fee

```ts
// packages/parsers/src/transaction/fees.ts
export function resolvePriorityFeeLamports(
    transaction: ParsedTransaction,
    meta: { feeLamports: number | undefined },
): number | undefined;
```

## Decisions

- **`app/shared/lib/v1-message-bridge.ts` stays in the app.** Its version-neutral parts move out:
  `isV1MessageBytes`, the size constants, the config reader. What remains is `V1MessageView`,
  `UnsignedV1WireTransaction` and a `toWireTransactionBytes` helper. All three are web3.js-typed, have one
  consumer (the app, never MCP), and have a deletion date once the inspector is kit-native. Moving code that
  is about to be deleted buys a coverage gate and costs a migration. Revisit if the inspector rebuild slips.
  `@explorer/parsers` already depends on web3.js for its `./compat` subpath, so the shim would land there,
  never in `./transaction`.
- **The package accepts RPC responses. It makes no RPC calls.**.

## Steps:

1. **Create the transaction package.** Union, constructors, helpers, config reader. No consumer switched. MCP
   payloads untouched.
2. **Update MCP to use the package.** `entity-inspector` passes its response to `fromRpcTransaction`, deletes
   its local `TransactionVersion` and account resolver, raises the RPC version ceiling and accepts v1 in the
   normaliser. Legacy and v0 payloads are proven byte-identical by snapshots taken before the switch. The
   payload type keeps its own `| null` version arm, because `transaction_version` reports `null` when the
   caller omitted the ceiling, and that is part of the pinned contract even though the union has no such arm.
3. **Move compute budget knowledge into the package.** The reserve schedule, the per-program defaults and the
   instruction reader move to `@explorer/parsers/programs/compute-budget`. The package gains
   `getRequestedComputeUnits`, and the two app estimators become thin wrappers over it, so no caller and no
   test has to change yet. `compute-unit` keeps `formatInstructionLogs`, the block summary and the
   profiling card, and stops inventing a per-instruction reserve for v1. That needs three changes:
   `formatInstructionLogs` takes the transaction version, `scheduledUnits` becomes optional on `InstructionCUData`,
   and a v1 row the logs said nothing about shows a dash instead of a reserve it never had. `transaction-fee` exposes
   `resolvePriorityFeeLamports`.
4. **Update block pages to use the package.** `fetch-block.ts` calls `fromRpcTransaction` instead of sniffing
   `0x81` and bridging. `BlockTransaction` holds a `ParsedTransaction` plus its own `meta`, and `BlockWithV1`
   drops its widened version field. Block cards read accounts and instructions from the transaction, and call
   `getRequestedComputeUnits` directly.
5. **Remove version branches from components.** `SummaryCard` and `InspectorPage` consume entity helpers and
   package helpers. The transaction config card renders on `getTransactionConfig(tx) !== undefined`. No
   `version === 1` literals remain under `app/features/transaction` or `app/components/inspector`. With the
   last callers moved, both estimator wrappers are deleted.
6. **Shrink the web3.js shim.** The bridge keeps only its web3.js classes and `toWireTransactionBytes`, until
   the kit-native inspector lands.

One check sits outside this change. `get-transactions-for-address.ts` omits the version ceiling, because
`transactionDetails: 'signatures'` returns no message to version-gate. That call is Triton's own method on the
production history path, so it needs one run against an address with v1 activity to confirm v1 signatures come
back.

## Summary

### Package structure

```
packages/parsers/src/
├── transaction/
│   ├── index.ts                     public surface
│   ├── types.ts                     the union, its parts, and the RPC shapes it is built from
│   ├── parse-transaction.ts         every input -> ParsedTransaction
│   ├── accounts.ts                  static and v0 resolvers, private
│   ├── config.ts                    configMask reader, RPC config adapter
│   ├── size.ts                      size limit, wire size
│   ├── version.ts                   v1 byte sniff, typed error
│   ├── compute-units.ts             getRequestedComputeUnits
│   └── __tests__/
└── programs/compute-budget/
    ├── index.ts                     public surface
    ├── instructions.ts              limit and price readers
    ├── reserve-schedule.ts          feature gate table, SupportedCluster
    ├── default-compute-units.ts     per-program defaults from Agave
    └── __tests__/
```

### Package exports

```jsonc
// packages/parsers/package.json
"exports": {
    "./transaction": {
        "types": "./dist/transaction/index.d.ts",
        "import": "./dist/transaction/index.js",
        "default": "./dist/transaction/index.js"
    },
    "./programs/compute-budget": {
        "types": "./dist/programs/compute-budget/index.d.ts",
        "import": "./dist/programs/compute-budget/index.js",
        "default": "./dist/programs/compute-budget/index.js"
    }
}
```

### `transaction/types.ts`

```ts
export type TransactionVersion = 'legacy' | 0 | 1;
export type ReportedTransactionVersion = TransactionVersion | null;

export type TransactionAccount = {
    address: Address;
    signer: boolean;
    writable: boolean;
    source: 'static' | 'lookupTable';
    lookupTableAddress?: Address;
};

export type TransactionInstruction = {
    programAddress: Address;
    accounts: readonly TransactionAccount[];
    data?: Uint8Array;
    parsed?: unknown;
};

export type TransactionConfig = {
    computeUnitLimit?: number;
    heapSize?: number;
    loadedAccountsDataSizeLimit?: number;
    priorityFeeLamports?: bigint;
};

export type ParsedTransaction =
    | (TransactionBase & { version: 'legacy' })
    | (TransactionBase & { version: 0; addressTableLookups?: readonly AddressTableLookup[] })
    | (TransactionBase & { version: 1; config?: TransactionConfig });

// The RPC shapes the union is built from, declared structurally.

export type RpcTransactionResponse = {
    meta?: { loadedAddresses?: { readonly: readonly string[]; writable: readonly string[] } | null } | null;
    transaction: RpcWireTransaction | RpcJsonTransaction | RpcJsonParsedTransaction;
    version?: ReportedTransactionVersion | bigint;
};

export type RpcTransactionConfig = {
    computeUnitLimit: number | null;
    heapSize: number | null;
    loadedAccountsDataSizeLimit: number | null;
    priorityFee: bigint | null;
};
```

### `transaction/parse-transaction.ts`

```ts
export function fromCompiledMessage(
    message: CompiledTransactionMessage,
    options?: { loadedAddresses?: LoadedAddresses; signatures?: readonly (string | undefined)[] },
): ParsedTransaction;

export function fromMessageBytes(bytes: Uint8Array, options?: FromMessageOptions): ParsedTransaction;

export function fromRpcTransaction(response: RpcTransactionResponse): ParsedTransaction;
```

### `transaction/accounts.ts`

```ts
// Private. `fromRpcTransaction` picks between them where the version is already known.
function resolveStaticAccounts(params: AccountResolutionParams): AccountResolutionResult;
function resolveV0Accounts(params: AccountResolutionParams): AccountResolutionResult;

export type AccountResolutionResult = {
    accounts: TransactionAccount[];
    /** Set when the lookup table index counts do not cover `loadedAddresses`. Attribution is partial. */
    lookupCountsMismatch?: true;
};
```

### `transaction/config.ts`

```ts
export function getTransactionConfig(transaction: ParsedTransaction): TransactionConfig | undefined;
export function readTransactionConfig(message: CompiledTransactionMessage): TransactionConfig | undefined;
export function fromRpcTransactionConfig(config: RpcTransactionConfig | undefined): TransactionConfig | undefined;
```

### `transaction/size.ts`

```ts
export const LEGACY_TRANSACTION_SIZE_LIMIT = 1232;
export const V1_TRANSACTION_SIZE_LIMIT = 4096;

export function transactionSizeLimit(source: ParsedTransaction | CompiledTransactionMessage | Uint8Array): number;
export function transactionWireSize(messageBytes: Uint8Array): number;
```

### `transaction/version.ts`

```ts
export function isV1MessageBytes(bytes: Uint8Array): boolean;

export class UnsupportedTransactionVersionError extends Error {
    readonly version: unknown;
}
```

### `transaction/compute-units.ts`

```ts
export function getRequestedComputeUnits(
    transaction: ParsedTransaction,
    context: { cluster: SupportedCluster; epoch: bigint | undefined },
): { value: number; source: 'declared' | 'fallback' | 'calculated' };
```

## `programs/compute-budget` package

### `programs/compute-budget/instructions.ts`

```ts
export function readComputeUnitLimitFromInstruction(instruction: TransactionInstruction): number | undefined;
export function readComputeUnitPriceFromInstruction(instruction: TransactionInstruction): bigint | undefined;
```

### `programs/compute-budget/reserve-schedule.ts`

```ts
export type SupportedCluster = 'custom' | 'devnet' | 'mainnet-beta' | 'testnet';

export function getReservedComputeUnits(args: {
    cluster: SupportedCluster;
    epoch?: bigint;
    programAddress: Address;
}): number;
```

### `programs/compute-budget/default-compute-units.ts`

```ts
export function getDefaultComputeUnits(programAddress: Address): number;
```
