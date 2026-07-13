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

`tryCreate*` never throws on untrusted JSON — it returns an error-first tuple. The `error` is a plain
value: throw it if you prefer exceptions (the one `throw` in this guide), but we suggest branching on
it, the way every example below does.

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
// error → a miss or pipeline failure; branch on it instead of throwing, never a crash
if (!error) {
    args.amount; // typed inside the happy branch — no narrowing ceremony
}
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

`decodeInstruction` also accepts a handler map instead of an `if` — the map is exhaustive: one
branch per arm the client's type carries. A Codama-root client (native or converted) carries only
`codama` / `unknown`, so the map buys little there:

```ts
const args = client.decodeInstruction(instruction, {
    codama: decode => client.getDecodedData<{ amount: bigint }>(decode),
    unknown: () => undefined,
});
```

A raw Anchor IDL client also carries `anchor`, so its map must include that branch — even though the
arm only fires once a fallback decoder fills it (see [below](#legacy-anchor-idls)).

## Decoding accounts

The account counterpart of `decodeInstruction` — the two-step primitive behind `decodeAccountData`,
same shape:

```ts
const decode = client.decodeAccount(accountData);
if (decode.kind === IdlStandard.Codama) {
    const account = client.getDecodedData<{ authority: string; count: bigint }>(decode);
}
```

`decodeAccount` takes the same handler map as `decodeInstruction`. A Codama-root client's map is
`codama` / `unknown`:

```ts
const summary = client.decodeAccount(accountData, {
    codama: decode => client.getDecodedData<{ authority: string }>(decode),
    unknown: () => undefined,
});
```

A raw Anchor IDL client also carries the `anchor` branch — like the instruction side, it fires only
when a wired `fallbackDecoder.decodeAccount` rescues data the pipeline missed (see
[below](#legacy-anchor-idls)).

## Typed payloads — when knowledge exists

Two axes decide what the decode routes can type: the IDL's **standard**, and **when** you know the
program — *build time* (a type is present → static typings) or *runtime* (only the fetched JSON
exists → payloads type as `unknown`, but the decode carries the exact schema). Every sample below is
executable: `__tests__/integration/readme-flows.integration.spec.ts` runs them with type assertions.

### Codama IDLs · build time

**The schema is the type source — zero generics.** The only requirement is that the IDL is TS source
(`as const`) so the compiler can read it; JSON imports widen and lose inference. The RootNode TS
variant may already be accessible (shipped by the program), or **built in advance** — run the
anchor→codama conversion at build time and save the result:

```ts
import { createIdlClient } from '@explorer/idl';
import { codamaProvider } from '@explorer/idl/codama';
import { vaultIdl } from './idl/vault'; // `as const` root node — the IDL IS the type

const client = createIdlClient(vaultIdl, { provider: codamaProvider() });

const [, data] = client.decodeInstructionData(instruction);
//        ^? { amount: bigint; discriminator: number } | undefined — read off the schema's `deposit` instruction
```

**Pick account payloads by name.** `AccountsDataOf` keys the inferred payloads by account name — and
doubles as the decode-shape reference, because inferred types mirror what the parser *returns*, not
the on-chain layout:

```ts
import type { AccountsDataOf } from '@explorer/idl';

type ConfigAccount = AccountsDataOf<typeof nttIdl>['config'];
//   ^? {
//        discriminator: [string, string]; // bytes → [encoding, data] tuple, NOT Uint8Array
//        owner: string;                   // Address/pubkey → plain base58 string, NOT a branded Address
//        pendingOwner:                    // Option<pubkey> → kit {__option} object, NOT `string | null`
//            | { __option: 'None' }
//            | { __option: 'Some'; value: string };
//        mode: number;                    // scalar enum → its variant INDEX, NOT the variant name
//        chainId: { id: number };         // defined type → resolved inline
//        enabledTransceivers: { map: bigint }; // u128 (and u64/i64/i128) → bigint, NOT number
//        paused: boolean;
//        // …
//      }
```

**Refine a fetched IDL with a generated client type.** renderers-js types describe the codec view
(`Address` pubkeys, `Uint8Array` bytes) which the parser does not uphold — pass them through
`AsDecoded<T>` (see its JSDoc for the mapping).

### Codama IDLs · runtime

**Payloads unknown, values exact.** A runtime-fetched root is the wide `CodamaIdl` — names and kinds
are plain strings, nothing to infer from. Decoding still works exactly; only the static guidance is
absent (claim a shape per call when you know it: `decodeAccountData<{ m: number }>(…)`):

```ts
const idl: CodamaIdl = await fetchIdlFromChain(programId); // wide — no literal type
const client = createIdlClient(idl, { provider: codamaProvider() });

const [, data] = client.decodeAccountData(accountData);
//        ^? unknown — a wide IDL carries no literals to read; the value is still exact at runtime
```

**The decode carries the exact schema.** No type exists for a fetched IDL, but the two-step route
keeps the whole decode envelope — `unwrapCodama` narrows to the codama arm (or throws a typed
`IdlError`) and surfaces the matched schema node, so unknown-program consumers render by node kind,
never by guessing the value's shape:

```ts
import { unwrapCodama } from '@explorer/idl';

const { data, node } = unwrapCodama(client.decodeAccount(accountData));
//            ^? node: AccountNode — the exact schema, at runtime; data stays unknown

if (node.data.kind === 'structTypeNode') {
    node.data.fields.map(field => `${field.name}: ${field.type.kind}`);
    // ['m: numberTypeNode', 'n: numberTypeNode', 'isInitialized: booleanTypeNode', 'signers: arrayTypeNode']
}
```

### Anchor IDLs · build time

**The satellite type anchor emits — zero generics.** `anchor build` writes a TS type next to the
JSON (`target/types`); pair them (`idlJson as unknown as MyProgram`, or fetch with
`Program.fetchIdl<MyProgram>`) and payloads infer from the IDL itself — one union member per
declared instruction.

The strongest anchor route, though, is the codama one above: convert the anchor JSON **at build
time** (`convertToCodama` / nodes-from-anchor), save the root `as const`, and the full codama
inference applies to the anchor-born program.

### Anchor IDLs · runtime

Same rule as any runtime IDL: payloads type as `unknown` (claim a shape per call when you know it),
and the exact schema still arrives with every decode — the engine creates it from the anchor JSON
internally via nodes-from-anchor:

```ts
const { data, node } = unwrapCodama(client.decodeInstruction(instruction));
//            ^? node: InstructionNode — born from the anchor JSON
node.arguments.map(argument => `${argument.name}: ${argument.type.kind}`);
// ['discriminator: fixedSizeTypeNode', 'amount: numberTypeNode']
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
// error → IDL_ERROR__IDL_PARSE_FAILED (the document could not be converted); handle it as a value
if (!error) {
    const client = createCodamaIdlClient(root); // root is already a Codama IDL
}
```

Left to convert internally, a nodes-from-anchor failure is *not* silent: the decode falls to the
`unknown` arm with the conversion error in `decode.errors` — a pipeline failure, not a plain miss
(`errors: []`). With a `fallbackDecoder` wired, a successful rescue lands on the `anchor` arm
instead, the conversion error preserved in `recoveredFrom`.

## Legacy Anchor IDLs

Pre-0.30 IDLs route to consumer-owned decoding; modern IDLs the conversion route cannot
handle get an injected escape hatch — its result lands in the anchor arm, for instructions and
accounts alike:

```ts
import { isLegacyAnchorIdl } from '@explorer/idl';

isLegacyAnchorIdl(idl); // true → decode it yourself; the client will not accept it

const client = createCodamaIdlClient(idl, {
    fallbackDecoder: {
        decodeAccount: (idl, data) => myCustomAccountDecode(idl, data),
        decodeInstruction: (idl, ix) => myCustomDecode(idl, ix),
    },
});
```

The decoder's return value picks the arm: return a value and the decode lands on the `anchor` arm;
return `undefined` and it falls through to the `unknown` arm. It never guesses — no rescue means no
anchor result.

Here all three arms are live — the handler map is worth it: `codama` for instructions the
conversion decoded, `anchor` for those your fallback decoder rescued, `unknown` for the rest.
`createCodamaIdlClient` pre-wires the engine, so no provider is passed at the call site:

```ts
const client = createCodamaIdlClient(idl, { fallbackDecoder });

const label = client.decodeInstruction(instruction, {
    codama: decode => client.getDecodedData(decode), // converted + decoded natively
    anchor: decode => decode.decoded, // rescued by your fallback decoder (decode.recoveredFrom holds bypassed errors)
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
