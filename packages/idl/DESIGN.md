# @explorer/idl — Design

One typed, standard-aware client over a program IDL: modern Anchor (>= 0.30) and Codama roots decode
through a single pipeline; legacy pre-0.30 Anchor is rejected as direct client input but converts
through the same `convertToCodama` route. Decode results are discriminated unions narrowed statically
per standard — a Codama client cannot even express an anchor-arm handler. The README documents the
consumer API; this file records the shape and the WHY.

## Client flow

Construction — untrusted input goes error-first, typed input throws; both land on the same client:

```mermaid
flowchart TD
    subgraph UNTRUSTED["Untrusted route — error-first"]
        RAW["unknown JSON<br/>(RPC / PMP / upload)"] --> TRY["tryCreateIdlClient(idl)"]
        TRY -->|"unsupported"| ERR["[IdlError(UNSUPPORTED_IDL_FORMAT), undefined]"]
    end
    subgraph TRUSTED["Trusted route — throws"]
        TYPED["typed IDL<br/>(AnchorIdl | CodamaIdl)"]
    end
    TRY -->|"supported"| CREATE["createIdlClient(idl, options?)"]
    TYPED --> CREATE
    CREATE -->|"lying type"| THROW["throw IdlError(UNSUPPORTED_IDL_FORMAT)"]
    CREATE -->|"codama engine by default<br/>{ provider } swaps it"| CLIENT["IdlClient&lt;T&gt;<br/>metadata + decode surface"]
    TYPED --> METACREATE["createIdlMetaClient(idl)"]
    METACREATE --> META["IdlMetaClient&lt;T&gt;<br/>metadata + names, no decode surface"]
    LEGACY["AnchorV00Idl (legacy, pre-0.30)"] -. "recognized, rejected" .-> TRY
```

Instruction decode — one codama-normalized pipeline; the anchor arm exists only via the injected escape hatch:

```mermaid
flowchart TD
    IX["decodeInstruction(ix)"] --> ADDR{"IDL declares address<br/>≠ ix.programAddress?"}
    ADDR -->|yes| MISMATCH["throw IdlError(IDL_ADDRESS_MISMATCH)<br/>wiring bug — fail loud"]
    ADDR -->|no| ROOT{"convertToCodama(idl)<br/>public, Result-returning"}
    ROOT -->|"Codama IDL"| PARSE
    ROOT -->|"Anchor IDL → rootNodeFromAnchor"| PARSE["parseInstruction(root, ix)<br/>@codama/dynamic-parsers"]
    ROOT -->|"conversion throws"| COLLECT["errors += IdlError(IDL_PARSE_FAILED,<br/>operation: rootNodeFromAnchor)"]
    PARSE -->|"parsed"| CODAMA["{ kind: codama, decoded }"]
    PARSE -->|"undefined — discriminator miss"| FALLBACK
    PARSE -->|"throws"| COLLECT2["errors += IdlError(INSTRUCTION_DECODE_FAILED)<br/>converted already — a decode failure, not a parse failure"]
    COLLECT --> FALLBACK{"Anchor IDL and<br/>options.fallbackDecoder?.decodeInstruction?"}
    COLLECT2 --> FALLBACK
    FALLBACK -->|"decoder returns value"| ANCHOR["{ kind: anchor, decoded }<br/>(only producer of this arm)"]
    FALLBACK -->|"no / returns undefined"| UNKNOWN["{ kind: unknown, errors }<br/>errors empty ⇔ plain miss"]
```

`decodeAccount(data)` runs the same pipeline (`parseAccountData`, no address check, same escape hatch).
Handler maps are total by type; a runtime miss throws `MISSING_DECODE_HANDLER` — the bypassed-types tripwire.
`getDecodedData` asymmetry: the codama arm yields the engine result's `data`, the anchor arm the injected decoder's whole value.

## Decisions

- **Codama-normalized single pipeline** — anchor converts (`@codama/nodes-from-anchor`), one engine (`@codama/dynamic-parsers`) decodes everything; two engines would be double maintenance for the same bytes.
- **Anchor arm = escape hatch only** — the injected `fallbackDecoder` is the sole producer of `{ kind: anchor }`; its payload stays `unknown` so consumers never couple to a library guess; bypassed pipeline errors survive in `recoveredFrom`.
- **Legacy pre-0.30 = convert first, never direct input** — recognized (`isLegacyAnchorIdl`), rejected by the client at compile time and runtime; `convertToCodama` converts the legacy shape too (nodes-from-anchor handles both), the consumer injects the program address the legacy IDL may lack.
- **Errors are values** — error-first `Result` tuples; decode failures ride the `unknown` arm as coded `IdlError`s (plain miss ⇔ `errors: []`); codes follow `@codama/errors`: stable numbers, typed context, throws split by pipeline stage.
- **Guards over a `standard` field** — `isAnchorStandard`/`isCodamaStandard` narrow the client; a string field invites untyped branching.
- **Codama payloads typed from the engine** — `NonNullable<ReturnType<typeof parseInstruction>>`, never a hand-maintained mirror.
- **Default engine rides the main entry** — ease of use over an engine-free core; the trade: every main-entry consumer loads the codama pipeline. Names-only consumers get `createIdlMetaClient` instead.
- **Heavy machinery behind subpaths** (`./fetch`, `./anchor`, `./codama`) — an entry earns its keep only when it guards a dependency subtree some real consumer profile must never load; tree-shaking alone does not protect plain-Node ESM consumers.
- **Parsed-data only** — rendering, hooks, ErrorBoundaries are consumer layers; unknown programs render by schema node (`getDecodedEntries`), never by value shape.
- **Real-artifact tests** — fixture programs build genuine IDLs (sha256-true discriminators) and mainnet snapshots are committed; CI never invokes the Rust/Anchor toolchain (regeneration is manual — DEVELOPMENT.md).

## Non-Goals

- IDL sources beyond the two on-chain legs (PMP `idl` metadata, Anchor IDL PDA) — registries and caches plug in as consumer-supplied fetchers.
- The Anchor-rich decode path (events, nested account groups) — a future seam, not this core.
- Legacy pre-0.30 IDLs as direct client input — consumers convert first (`convertToCodama`) or own the decoder.
