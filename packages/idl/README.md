# @explorer/idl

One small client over Solana program IDLs: detection, names, and decoding, regardless of which
standard produced the IDL.

- **Anchor** — modern IDLs (`metadata.spec`), emitted by `anchor build` since 0.30
- **Codama** — root nodes, as the program-metadata program (PMP) stores them
- **Legacy Anchor** — pre-0.30 IDLs are recognized and *rejected* with a typed error

## Entries

The main entry is engine-free; every entry is side-effect-free and tree-shakeable (gated).

| Import                | Ships                                                             |
| --------------------- | ------------------------------------------------------------------ |
| `@explorer/idl`        | client, guards, names, errors, types — no decode engine            |
| `@explorer/idl/codama` | the codama decode engine + `createCodamaIdlClient` wrappers        |
| `@explorer/idl/anchor` | Anchor IDL helpers (`convertToCodama`)                        |

## Quick start

`tryCreate*` never throws on untrusted JSON — it returns an error-first tuple:

```ts
import { isCodamaStandard, isIdlError, IDL_ERROR__UNSUPPORTED_IDL_FORMAT } from '@explorer/idl';
import { tryCreateCodamaIdlClient } from '@explorer/idl/codama';

const [error, client] = tryCreateCodamaIdlClient(fetchedJson);
if (error) throw error; // code-discriminated: isIdlError(error, IDL_ERROR__UNSUPPORTED_IDL_FORMAT)

client.programName(); // 'Token'
client.programAddress(); // 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
client.instructionName(instructionData); // 'Transfer'
isCodamaStandard(client); // narrows the client to one standard
```

## Names-only client

Without options, `createIdlClient` returns a metadata client — decode methods are statically
absent, no engine code is loaded:

```ts
import { createIdlClient, type IdlMetaClient } from '@explorer/idl';

// names and metadata only — decode methods do not exist on the type
const meta: IdlMetaClient = createIdlClient(idl);
```

## Decoding client

Decoding takes a provider — the engine is an explicit dependency, injected at construction:

```ts
import { createIdlClient, type IdlClient } from '@explorer/idl';
import { codamaProvider, createCodamaIdlClient } from '@explorer/idl/codama';

// the metadata surface plus decode methods, bound to the injected engine
const client: IdlClient = createIdlClient(idl, { provider: codamaProvider() });

// the same client with the codama engine pre-wired
const same: IdlClient = createCodamaIdlClient(idl);
```

## Decoding instructions

Results are discriminated by the producing standard. A miss is `{ kind: 'unknown', errors: [] }`;
a pipeline failure carries its errors — never a crash:

```ts
import { IdlStandard } from '@explorer/idl';
import { createCodamaIdlClient } from '@explorer/idl/codama';

const client = createCodamaIdlClient(idl);
const decode = client.decodeInstruction(instruction); // a @solana/kit Instruction

if (decode.kind === IdlStandard.Codama) {
    const args = client.getDecodedData<{ amount: bigint }>(decode); // u64 → bigint, pubkey → base58 string
}
```

Or declare the outcomes as a handler map, typed to exactly the arms the IDL's standard can produce:

```ts
const outcome = client.decodeInstruction(instruction, {
    codama: decode => ({ data: client.getDecodedData<{ amount: bigint }>(decode), source: 'codama' }),
    unknown: decode => ({ data: undefined, source: decode.errors.length ? 'failed' : 'not in this IDL' }),
});
```

## Decoding accounts

```ts
const decode = client.decodeAccount(accountData);
if (decode.kind === IdlStandard.Codama) {
    const account = client.getDecodedData<{ authority: string; count: bigint }>(decode);
}
```

## One-step data access

`decodeInstructionData` / `decodeAccountData` collapse decode + payload into one error-first
result; the optional `kind` argument asserts which arm produced it (`DECODE_KIND_MISMATCH` otherwise):

```ts
const [ixError, args] = client.decodeInstructionData<{ amount: bigint }>(instruction);
const [accError, account] = client.decodeAccountData<{ authority: string }>(accountData, IdlStandard.Codama);
```

## Typed payloads — four routes

**1. Anchor generated companion type — zero generics.** Pair the built JSON with the
`target/types` type (the `Program<MyProgram>` idiom) and payloads infer from the IDL itself:

```ts
import type { MyProgram } from './target/types/my_program';
import idlJson from './target/idl/my_program.json';

const client = createCodamaIdlClient(idlJson as unknown as MyProgram);
const decode = client.decodeInstruction(instruction);
if (decode.kind === IdlStandard.Codama) {
    const args = client.getDecodedData(decode); // inferred union of the program's instruction args
}
```

**2. Codama literal IDL — zero generics.** Codama ships no generated IDL types and JSON
imports widen — hold the root node in a TS module `as const` and payloads infer the same way:

```ts
// idl/vault.ts — `as const` keeps the literals inference reads; the IDL IS the type
export const vaultIdl = { kind: 'rootNode', program: { /* … */ } } as const;

const client = createCodamaIdlClient(vaultIdl);
const decode = client.decodeAccount(accountData);
if (decode.kind === IdlStandard.Codama) {
    const account = client.getDecodedData(decode); // { authority: string; count: bigint } — inferred
}
```

**3. Per-call shape.** Runtime-fetched JSON (either standard) has no compile-time type — inference
degrades to `unknown`; declare the shape at the call (samples above).

**4. `AsDecoded` — reuse codama-generated client types.** `@codama/renderers-js` types describe
*their* codecs; `AsDecoded<T>` maps them to this decoder's output (addresses → base58 strings,
bytes → `[encoding, data]` tuples):

```ts
import type { AsDecoded } from '@explorer/idl';
import type { Multisig } from '@solana-program/token-2022'; // type-only, erased at runtime

const account = client.getDecodedData<AsDecoded<Multisig>>(decode);
account.signers; // string[], not Address[]
```

## Anchor IDLs

Anchor IDLs go through the same client — conversion to Codama happens inside the engine, so
decodes land in the codama arm:

```ts
import anchorIdl from './target/idl/my_program.json';

const client = createCodamaIdlClient(anchorIdl);
const decode = client.decodeInstruction(instruction);
decode.kind; // IdlStandard.Codama — the conversion is an implementation detail
```

## Legacy Anchor IDLs

Pre-0.30 IDLs route to consumer-owned decoding; modern IDLs the conversion route cannot
handle get an injected escape hatch — its result lands in the anchor arm:

```ts
import { isLegacyAnchorIdl } from '@explorer/idl';

isLegacyAnchorIdl(idl); // true → decode it yourself; the client will not accept it

const client = createCodamaIdlClient(idl, {
    legacyAnchorDecoder: (idl, ix) => myCustomDecode(idl, ix), // undefined → 'unknown' arm
});

const decode = client.decodeInstruction(instruction);
if (decode.kind === IdlStandard.Anchor) {
    decode.decoded; // your decoder's payload
    decode.recoveredFrom; // pipeline errors the rescue bypassed, when any
}
```

## Converting Anchor IDLs to Codama

```ts
import { convertToCodama } from '@explorer/idl/anchor';

const [error, rootNode] = convertToCodama(anchorIdl);
```

## Errors

`IdlError` with stable numeric codes (`IDL_ERROR__*`) and per-code typed context, modelled on
`@codama/errors`; `isIdlError(e, code)` narrows both. Unknown-arm contract: `errors: []` = the
bytes did not match; non-empty = the pipeline failed and tells you where.

## Development

```sh
pnpm --filter @explorer/idl test           # typecheck → unit → integration → tree-shakeability
pnpm --filter @explorer/idl test:coverage  # v8 runtime coverage + strict type-coverage
```

Fixture programs: [DEVELOPMENT.md](./DEVELOPMENT.md). Architecture and decisions: [DESIGN.md](./DESIGN.md).
