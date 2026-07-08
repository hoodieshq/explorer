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

meta.programName(); // 'Token' — undefined if the IDL declares none
meta.programAddress(); // 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
meta.programVersion(); // '3.3.0' — the program's own semver, undefined if absent
meta.formatVersion(); // Codama root version, or Anchor's metadata.spec
```

`instructionName` resolves an instruction's name from its data bytes alone — a longest-prefix match
against the IDL's discriminators, no decode engine needed. Pass the raw `data` of a `@solana/kit`
instruction:

```ts
meta.instructionName(instruction.data); // 'Transfer' — undefined when no discriminator matches
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

## One-step data access

Prefer the one-step helpers for the common "decode and read the payload" case:
`decodeInstructionData` / `decodeAccountData` collapse decode and payload into a single error-first
result — no arm to narrow, just the data or an error. The two-step `decodeInstruction` /
`decodeAccount` primitives ([below](#decoding-instructions)) are for when you need the arm, kind, or
raw errors instead.

```ts
const [error, args] = client.decodeInstructionData<{ amount: bigint }>(instruction);
if (error) throw error; // a miss or pipeline failure — never a crash
args.amount; // typed, no narrowing needed past the error check
```

Passing a second argument asserts the arm you expect. If the decode lands on a *different* arm, you
get an `IDL_ERROR__DECODE_KIND_MISMATCH` in the error slot instead of the data — the assertion never
returns the wrong-arm payload:

```ts
import { IDL_ERROR__DECODE_KIND_MISMATCH, IdlStandard, isIdlError } from '@explorer/idl';

// require the codama arm; an anchor- or unknown-arm result becomes an error
const [error, account] = client.decodeAccountData<{ authority: string }>(accountData, IdlStandard.Codama);
if (isIdlError(error, IDL_ERROR__DECODE_KIND_MISMATCH)) {
    error.context; // { expected: IdlStandard.Codama, received: 'anchor' | 'unknown' } — what it got instead
}
```

## Decoding instructions

The two-step primitive behind `decodeInstructionData` — decode to a discriminated result, then read
the payload. Results are discriminated by the producing standard. A miss is
`{ kind: 'unknown', errors: [] }`; a pipeline failure carries its errors — never a crash:

```ts
import { IdlStandard } from '@explorer/idl';
import { createCodamaIdlClient } from '@explorer/idl/codama';

const client = createCodamaIdlClient(idl);
const decode = client.decodeInstruction(instruction); // a @solana/kit Instruction

if (decode.kind === IdlStandard.Codama) {
    const args = client.getDecodedData<{ amount: bigint }>(decode); // u64 → bigint, pubkey → base58 string
}
```

`decodeInstruction` also accepts a handler map instead of an `if` — one branch per arm the IDL's
standard can produce. A Codama client only ever yields `codama` / `unknown`, so it buys little there;
it earns its keep on Anchor IDLs with a legacy decoder, where all three arms are live (see below).

```ts
const args = client.decodeInstruction(instruction, {
    codama: decode => client.getDecodedData<{ amount: bigint }>(decode),
    unknown: () => undefined,
});
```

## Decoding accounts

The account counterpart of `decodeInstruction` — the two-step primitive behind `decodeAccountData`,
same shape:

```ts
const decode = client.decodeAccount(accountData);
if (decode.kind === IdlStandard.Codama) {
    const account = client.getDecodedData<{ authority: string; count: bigint }>(decode);
}
```

`decodeAccount` takes the same optional handler map as `decodeInstruction`. Accounts have no
legacy-rescue path, so the arms are only ever `codama` / `unknown`:

```ts
const summary = client.decodeAccount(accountData, {
    codama: decode => client.getDecodedData<{ authority: string }>(decode),
    unknown: () => undefined,
});
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

Fetching through anchor's client works the same — pass the type to `Program.fetchIdl<MyProgram>` and
inference still flows. But fetch it untyped (plain `idl.json`, no companion type) and the IDL widens
to `AnchorIdl`; inference is gone, so you must hand the shape to the generic:

```ts
const idl = await Program.fetchIdl(programId, provider); // no generic → AnchorIdl (wide)
const client = createCodamaIdlClient(idl);
const decode = client.decodeInstruction(instruction);
if (decode.kind === IdlStandard.Codama) {
    const args = client.getDecodedData<{ amount: bigint }>(decode); // explicit — the type can't be inferred
}
```

Both forms feed an Anchor IDL to `createCodamaIdlClient`, which converts it to a Codama root via
nodes-from-anchor before decoding — that's why `decode.kind` is `Codama`, not `Anchor`. See
[Anchor IDLs](#anchor-idls) for that conversion and how it fails.

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
degrades to `unknown`, so declare the shape at the call:

```ts
const idl: CodamaIdl = await fetchIdlFromChain(programId); // wide — no literal type
const client = createCodamaIdlClient(idl);
const decode = client.decodeInstruction(instruction);
if (decode.kind === IdlStandard.Codama) {
    const args = client.getDecodedData<{ amount: bigint }>(decode); // the generic IS the shape
}
```

**4. `AsDecoded` — reuse a generated client type.** When a renderers-js type for the program already
exists — your own `target` output, or a published `@solana-program/*` client — reuse it instead of
hand-writing the decoded shape. It can't be passed *directly*, though: a generated type describes the
program's **encoder input / on-chain layout** (`Address` for pubkeys, `ReadonlyUint8Array` for byte
fields), while this decoder **returns** different runtime shapes (base58 `string`s, and
`[encoding, data]` tuples for bytes). Passing the generated type as-is would mistype the decoded data.
`AsDecoded<T>` rewrites it into what `getDecodedData` actually yields, so the two line up:

```ts
import type { AsDecoded } from '@explorer/idl';
import type { Multisig } from '@solana-program/token-2022'; // type-only, erased at runtime

const account = client.getDecodedData<AsDecoded<Multisig>>(decode);
account.signers; // string[], not Address[]
```

## Anchor IDLs

Anchor IDLs go through the same client — `createCodamaIdlClient` runs nodes-from-anchor to convert
the document to a Codama root before decoding, so a successful decode lands on the codama arm:

```ts
import anchorIdl from './target/idl/my_program.json';

const client = createCodamaIdlClient(anchorIdl);
const decode = client.decodeInstruction(instruction);
decode.kind; // IdlStandard.Codama — the conversion is an implementation detail
```

To run that conversion yourself — to catch a nodes-from-anchor failure explicitly — convert first:

```ts
import { convertToCodama } from '@explorer/idl/anchor';

const [error, root] = convertToCodama(anchorIdl); // nodes-from-anchor
if (error) throw error; // IDL_ERROR__IDL_PARSE_FAILED — the document could not be converted
const client = createCodamaIdlClient(root); // root is already a Codama IDL
```

Left to convert internally, a nodes-from-anchor failure is *not* silent: the decode falls to the
`unknown` arm with the conversion error in `decode.errors` — a pipeline failure, not a plain miss
(`errors: []`). With a `legacyAnchorDecoder` wired, a successful rescue lands on the `anchor` arm
instead, the conversion error preserved in `recoveredFrom`.

## Legacy Anchor IDLs

Pre-0.30 IDLs route to consumer-owned decoding; modern IDLs the conversion route cannot
handle get an injected escape hatch — its result lands in the anchor arm:

```ts
import { isLegacyAnchorIdl } from '@explorer/idl';

isLegacyAnchorIdl(idl); // true → decode it yourself; the client will not accept it

const client = createCodamaIdlClient(idl, {
    legacyAnchorDecoder: (idl, ix) => myCustomDecode(idl, ix),
});
```

The decoder's return value picks the arm: return a value and the decode lands on the `anchor` arm;
return `undefined` and it falls through to the `unknown` arm. It never guesses — no rescue means no
anchor result.

Here all three arms are live — the handler map is worth it: `codama` for instructions the
conversion decoded, `anchor` for those your legacy decoder rescued, `unknown` for the rest.
`createCodamaIdlClient` pre-wires the engine, so no provider is passed at the call site:

```ts
const client = createCodamaIdlClient(idl, { legacyAnchorDecoder });

const label = client.decodeInstruction(instruction, {
    codama: decode => client.getDecodedData(decode), // converted + decoded natively
    anchor: decode => decode.decoded, // rescued by your legacy decoder (decode.recoveredFrom holds bypassed errors)
    unknown: () => undefined,
});
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
