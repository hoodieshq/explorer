# Design: Decode PMP buffer content on the instruction page

Technical shape and risks behind `proposal.md`. Not a task breakdown - detailed planning (and the `specs/` delta
+ `tasks.md`) come later. Facts here were ground-truthed against the installed packages
(`@solana-program/program-metadata@0.7.0`, `@solana/web3.js@1.98.4`, `@solana/kit@6.5.0`) and the PMP program
source (`github.com/solana-program/program-metadata`, `main`).

## 1. Which PMP instructions carry decodable content

Discriminators and account order below were verified against the generated client (the `ProgramMetadataInstruction`
enum and the `getXInstruction` builders).

| Ix | Disc | Accounts | Args | Carries content? |
|----|------|-----------------|-------------|------------------|
| `setData` | 3 | `metadata, authority, buffer, program, programData` | `encoding, compression, format, dataSource, data` | YES - inline `data` OR from `buffer` account (index 2) |
| `initialize` | 1 | `metadata, authority, program, programData, system` | `seed, encoding, compression, format, dataSource, data` | YES - inline `data` OR from the metadata account itself (pre-allocated buffer, in-place) |
| `write` | 0 | `buffer, authority, sourceBuffer` | `offset, data` | Fragment only - a raw chunk, NO encoding/compression/format hints |
| `allocate` `setAuthority` `setImmutable` `trim` `extend` `close` | 7,2,4,5,8,6 | - | - | No payload |

Key facts:
- `setData` copies from an optional source `buffer` at account index 2. When omitted, that slot holds the program
  id - the program gates the external-buffer path on `buffer.address() != programId`.
- `setData` and `initialize` are the only instructions carrying the decode hints (`encoding`, `compression`,
  `format`, `dataSource`). The hints are historically exact because they are part of the transaction.
- Housekeeping ixs (`trim`, `extend`, `close`, `setAuthority`, `setImmutable`, `allocate`) never change the
  decoded payload. `trim` reallocs to `Header::LEN + data_length` and refunds rent - it does not touch
  `data_length`, the hints, or the bytes. So `setData + trim` and `setData + close` decode entirely from `setData`.
- Header length is fixed at 96 bytes (`Header::LEN == Buffer::LEN == 96`). This matters only when slicing RAW
  account bytes (skip the 96-byte header). It does NOT apply to `write`-ix replay - see 4.2.

## 2. Decoding toolkit (already installed)

`@solana-program/program-metadata@0.7.0` provides everything needed:
- Enums `Encoding` (None=0 -> hex, Utf8=1, Base58=2, Base64=3), `Compression` (None=0, Gzip=1, Zlib=2),
  `Format` (None=0, Json=1, Yaml=2, Toml=3), `DataSource` (Direct=0, Url=1, External=2). Numeric values verified.
- `unpackDirectData({data, encoding, compression}) -> string` - SYNC, no RPC (`uncompress -> decode`). Does NOT
  consume `format` - JSON/YAML/TOML rendering is the explorer's job (the enum only classifies content).
- `unpackAndFetchData({rpc, dataSource, data, encoding, compression}) -> Promise<string>` - handles
  Direct/Url/External (needs a `@solana/kit` `Rpc<GetAccountInfoApi>`). See the single-RPC-stack decision in 5.
- Typed decoders `getSetDataInstructionDataDecoder()`, `getInitializeInstructionDataDecoder()`,
  `getWriteInstructionDataDecoder()` - decode raw ix bytes to numeric enums + a typed `Option<bytes>`.
- `pako@2.1.0` (zlib/gzip) runs under the hood. WARNING: inflate is unbounded - cap it (see 6, decompression bomb).

`bytes.ts` has no base58 helper - base58 decode comes from the library (`decodeData`) / kit, not from
`app/shared/lib/bytes.ts`.

## 3. Reading the decode config

Decode the config from the RAW ix bytes with the typed decoders, NOT from the Codama-parsed args. At
`CodamaInstructionCard` both inputs are in hand: `ix.data` (a web3.js `Buffer`, i.e. a `Uint8Array` subclass) and
account addresses via `parsedIx.accounts`. The dynamic parser emits scalar enums as plain variant STRINGS
(`'Base64'`), not `{__kind:'Base64'}`, and `data` as an `Option` - re-decoding raw bytes yields numeric enums + a
typed `Option<bytes>` directly and avoids a brittle string->enum mapping. Import the enums from the library, do
not hardcode numeric values (version coupling to 0.7.0).

### High level implementation shape

Read the config + payload by decoding the RAW instruction bytes with the typed decoder (numeric enums + typed
`Option<bytes>`) rather than mapping Codama-parsed arg strings. At the card both are in hand: `ix.data` (raw
bytes) and `parsedIx.accounts` (addresses).

```ts
import {
  Encoding, Compression, Format, DataSource,
  getSetDataInstructionDataDecoder, getInitializeInstructionDataDecoder,
  unpackDirectData,   // SYNC: Direct decode, no RPC (uncompress -> decode). Does not consume `format`.
  unpackAndFetchData, // async: ONE call for Direct | Url | External (needs a kit Rpc). See RPC-stack decision (7).
} from '@solana-program/program-metadata';
import { unwrapOption } from '@solana/kit';

type DecodeConfig = {
  encoding: Encoding; // None(hex) | Utf8 | Base58 | Base64
  compression: Compression; // None | Gzip | Zlib
  format: Format; // None | Json | Yaml | Toml
  dataSource: DataSource; // Direct | Url | External
};

type DecodedContent = { text: string; format: Format; truncated: boolean };

// rawData = inline arg bytes (Direct) OR reconstructed buffer body (buffer-sourced, see 4).
// Direct is SYNC and needs NO RPC:
function decodeDirect(rawData: Uint8Array, config: DecodeConfig): DecodedContent {
  const text = unpackDirectData({ data: rawData, encoding: config.encoding, compression: config.compression });
  return { text, format: config.format, truncated: false }; // caller enforces size caps before/after
}

// Url | External need the network. Prefer ONE rpc stack (see 7). unpackAndFetchData wants a kit Rpc.
async function decodeFetched(rawData: Uint8Array, config: DecodeConfig, rpc: Rpc<GetAccountInfoApi>) {
  const text = await unpackAndFetchData({
    rpc, dataSource: config.dataSource, data: rawData,
    encoding: config.encoding, compression: config.compression,
  });
  return { text, format: config.format, truncated: false };
}

// JSON/YAML/TOML/None
function prettify(text: string, format: Format) {
  // Format=Json -> JSON.parse + stringify(2) with a size cap before parse; else show verbatim in <pre>.
}
```

## 4. Getting the bytes

### 4.1 setData / initialize branch table

Check inline `data` FIRST, fall to the buffer only when `data` is empty.

| Ix | Condition | Bytes source | Cost |
|----|-----------|--------------|------|
| `setData` | `data` non-empty | inline (this ix) | 0 RPC |
| `setData` | `data` empty AND `buffer` (idx 2) != PMP id | foreign buffer account | reconstruct |
| `setData` | `data` empty AND `buffer` (idx 2) == PMP id | none - header-only hint update (bytes unchanged) | nothing new |
| `initialize` | `data` non-empty | inline (this ix) | 0 RPC |
| `initialize` | `data` empty (in-place) | the metadata account itself | reconstruct |

The `buffer == PMP id` row is a header-only update (e.g. changing `format` without touching bytes) - the payload
bytes still exist in the account from prior writes, so "nothing new in THIS ix" is the honest UI, not "no data".

`initialize` has no foreign buffer. Its in-place path triggers when the metadata account already carries the
Buffer discriminator AND the ix has empty remaining data - `initialize` finalizes the pre-written bytes
(`allocate` + `write` on the metadata PDA) in place. From the instruction alone the explorer sees an empty `data`
arg and must reconstruct from the preceding `write` ixs (or read the account).

### 4.2 Reconstruction (feasibility + ceiling)

Reconstruction IS feasible. Two distinct techniques, and the difference matters:

- **Live account read** - one `getAccountInfo`, slice off the 96-byte header, read `[96, 96+data_length)`. Cheap,
  but gives the account's CURRENT state - correct for the viewed tx only if nothing changed it since, and returns
  `null` for a foreign buffer (the client closes it right after `setData` to reclaim rent).
- **Write-replay (the point-in-time method, and the only one for a closed buffer)**:
  - `getSignaturesForAddress(account)` -> txs that touched it
  - filter to `slot <= viewedSlot` and the current session (writes after the last `allocate`/`close`)
  - `getTransaction(sig, base64)` per tx -> raw ix bytes (NOT `getParsedTransaction`, which drops the ix bytes)
  - decode each `write` `(offset, chunk)` and PATCH the chunk into a fixed-size `data_length` buffer at `offset`
    (logical offset, NO +96 - the +96 is a physical-account detail only)
  - decode the assembled bytes with the `setData`/`initialize` hints

  Offset-patching is order-independent for non-overlapping writes, which sidesteps the same-slot ordering problem
  (`getSignaturesForAddress` has no intra-slot index). Use intra-tx ix order when writes share a tx.

**The one true blocker is RPC history retention.** Public/free nodes prune old transaction history, so an old
buffer's `write` txs may be gone -> reconstruction is physically impossible regardless of algorithm. Detect it
(writes do not cover `[0, data_length)`) and surface "reconstruction incomplete, needs archival RPC" - never
render partial bytes silently. Everything else (slot-scoping, same-slot ordering, the 96-byte offset) is
correctness detail, not a feasibility question.

Build cost: a ~40-60 line self-contained helper using the existing `Connection`. `@solana/idl`'s
`reconstructBufferData` is internal + not slot-scoped, and PR #90's `replayBufferWrites` is not in this checkout,
so this is a fresh build.

Network cost for one account up to slot S: `1` signatures call (a buffer has few sigs, fits one 1000-page) plus
`N` `getTransaction` calls where `N ~= payload_size / chunk_size` (chunk ~1 KB, bounded by the ~1232-byte tx). A
few-KB payload is a handful; a 100 KB IDL is ~100-200 calls, batched in parallel chunks of ~25. Inline case = 0.

#### `setData` from a foreign buffer account (`data` empty, `buffer` idx 2 != PMP id) (reconstructBufferAtSlot)

The instruction references a buffer account but carries no inline data. A live `getAccountInfo` on the buffer is
not viable - the client closes it right after `setData`, so it returns null. Two options:

- Option A - our own slot-scoped replay helper. ~40 lines, self-contained, uses the explorer's existing RPC.
  Bounded by the viewed transaction's slot (fixes the reused-buffer bug, see 6). PR #90's `replayBufferWrites` is
  NOT in this checkout, so this is a from-scratch build.
  - Reconstruct by OFFSET-PATCHING into a `data_length`-sized buffer, not by sequential append. The `write` ix
    `offset` field is the LOGICAL 0-based data offset - patch at `offset` (NO +96; the +96 only applies to raw
    account slicing). Offset-patching is order-independent for non-overlapping writes, which sidesteps the
    same-slot ordering problem (see 6). Use intra-transaction ix order when writes share a tx.
  - Detect + surface "reconstruction incomplete" when the writes do not cover `[0, data_length)` or RPC history
    is truncated - do NOT silently render partial bytes.
  ```ts
  async function reconstructBufferAtSlot(conn, buffer, maxSlot, dataLength): Promise<Uint8Array> {
    const sigs = (await conn.getSignaturesForAddress(buffer, { limit: 1000 }))
      .filter(s => !s.err && s.slot <= maxSlot); // newest-first from the RPC; do NOT rely on slot for intra-slot order
    const data = new Uint8Array(dataLength); // fixed-size, offset-patched
    for (const batch of chunk(sigs, 25)) { // parallel, rate-limit friendly
      const txs = await Promise.all(batch.map(s => conn.getTransaction(s.signature, {maxSupportedTransactionVersion: 0, encoding: 'base64'})));
      for (const tx of txs) for (const ix of pmpIxTargeting(tx, buffer)) {
        if (ix.disc === Allocate) { /* session boundary - see reused-buffer scoping in 6 */ }
        else if (ix.disc === Write) patchAt(data, ix.chunk, ix.offset); // logical offset, no +96
      }
    }
    return data; // buffer body as of maxSlot; caller checks coverage of [0, dataLength)
  }
  ```
- Option B - reuse `@solana/idl`. `reconstructBufferData` is INTERNAL (not exported), is not slot-scoped. Reuse
  would need a contribution (export `reconstructBufferData` + add a `maxSlot` param).

Use `getTransaction` (raw, base64) here, NOT `getParsedTransaction` - the raw ix bytes are needed to decode the
`write` chunks. The repo's `history.tsx` uses `getParsedTransaction`, so it does not provide the needed shape.

`initialize` in-place uses the SAME helper, targeting the metadata PDA (`accounts[0]`) instead of a foreign
buffer: `reconstructBufferAtSlot(conn, metadataPda, viewedSlot, dataLength)`. No separate buffer account exists -
writes accumulated on the metadata PDA itself (the common "metadata-PDA-as-buffer" create flow behaves the same).

#### P2 fast path - Triton `getTransactionsForAddress` (full mode)

We run Triton as the production main RPC, so in production this is the PRIMARY reconstruction path - the standard
two-step (`reconstructBufferAtSlot` above) is the FALLBACK for non-Triton clusters (devnet/testnet, a custom URL,
or a user's own RPC). Triton's `getTransactionsForAddress` (also served by Helius) returns full transactions WITH
instruction data in one filtered, ordered, paginated call, so it collapses the `1 + N` fan-out and pushes the slot
bound server-side. The repo already calls this method in `app/providers/accounts/history.tsx` (today in
`transactionDetails: 'signatures'` mode) and already has the try-then-fallback wiring (JSON-RPC `-32601` ->
`getSignaturesForAddress`), so the fallback is not new infra.

| Dimension | Triton `getTransactionsForAddress` (full) | `getSignaturesForAddress` + N x `getTransaction` |
|---|---|---|
| Round-trips for N write txs | ~ceil(N / pageCap) (Triton full cap 100, Helius up to 1000), so N <= cap is 1 request | 1 + N |
| Raw instruction bytes in one call | Yes - `encoding: 'base64'`, decode `write` chunks from the raw tx | No - signatures only, then re-fetch each tx |
| Slot bounding (`slot <= viewedSlot`) | Server-side via `filters.slot.lte` | Client-side: fetch sigs, filter/stop yourself |
| Same-slot ordering | Deterministic via `slot` + `transactionIndex`, `sortOrder: 'asc'` | No intra-slot index, best-effort |
| Availability | Triton / Helius only (`-32601` elsewhere) | Universal |
| Ease | One filtered, ordered, byte-carrying call per page | Two-step fan-out + manual slot filter |

The full-mode page cap is provider-specific (Triton 100, Helius up to 1000) - do not hardcode 100, derive it or
make it configurable. `commitment` defaults to `finalized`. The `paginationToken` (`"slot:position"`) is scoped to
the query filters, so do not reuse it across different filters.

```ts
// Fast path: one filtered, ordered, byte-carrying call per page. Same offset-patch assembly as the standard path.
async function reconstructViaTriton(url, account, boundSlot, dataLength): Promise<Uint8Array> {
  const data = new Uint8Array(dataLength);          // fixed-size, offset-patched (order-independent)
  let paginationToken: string | null = null;
  do {
    const res = await rpc(url, 'getTransactionsForAddress', [account, {
      transactionDetails: 'full',
      encoding: 'base64',
      sortOrder: 'asc',                             // oldest-first replay
      filters: { slot: { lte: boundSlot } },        // server-side slot bound = viewed tx slot
      limit: 100,                                    // Triton full-mode cap (Helius allows up to 1000)
      paginationToken,
    }]);
    for (const item of res.data) {                   // item = { slot, transactionIndex, transaction, meta }
      const tx = decodeBase64Tx(item.transaction);
      for (const ix of pmpWritesTargeting(tx, account)) {
        if (ix.disc === Allocate) { /* session boundary, reset - see 6 */ }
        else if (ix.disc === Write) patchAt(data, ix.chunk, ix.offset); // logical offset, NO +96
      }
    }
    paginationToken = res.paginationToken;           // walk until null
  } while (paginationToken);
  return data;                                       // caller checks coverage of [0, dataLength)
}

// Pick the fast path, fall back on method-not-found. Mirrors history.tsx's -32601 probe.
async function reconstructBuffer(url, conn, account, boundSlot, dataLength): Promise<Uint8Array> {
  try {
    return await reconstructViaTriton(url, account, boundSlot, dataLength);
  } catch (e) {
    if (!isMethodNotFound(e)) throw e;               // -32601 only, anything else is a real error
    return reconstructBufferAtSlot(conn, account, boundSlot, dataLength); // standard two-step (see above)
  }
}

// rpc(): raw JSON-RPC POST. Throw an Error with `.code = json.error.code` so isMethodNotFound can see -32601.
// isMethodNotFound and the -32601 fallback pattern already exist in app/providers/accounts/history.tsx.
```

Both paths MUST assemble identical bytes (offset-patched, slot-bounded, session-scoped). A test pins that - see the
`p2-program-metadata-buffer-reconstruction` spec.

### 4.3 write chunk (0 RPC)

`write` is a fragment with NO hints, so it cannot be decoded to a document on its own. Show `offset` + the raw
chunk (hex/base64) via `getWriteInstructionDataDecoder()`. If `data` is empty and a `sourceBuffer` (idx 2) is set,
the chunk was copied from another buffer - show the `sourceBuffer` address + a note, do not reconstruct here.

#### The chunk itself (inline) - 0 RPC

Decode the args and show `offset` + the raw chunk bytes (hex/base64). Arg decode is a library call, no custom
parsing:

```ts
import { getWriteInstructionDataDecoder } from '@solana-program/program-metadata';
import { unwrapOption } from '@solana/kit';

type WriteChunk = { offset: number; data?: Uint8Array; fromSourceBuffer: boolean };

function parseWrite(ix: { data: Uint8Array; accounts: Address[] }): WriteChunk {
  const { offset, data } = getWriteInstructionDataDecoder().decode(ix.data); // offset:u32, data:Option<bytes>
  const inline = unwrapOption(data);
  return { offset, data: inline, fromSourceBuffer: inline === undefined && ix.accounts[2] !== PMP };
}
```

Source: this mirrors PR #90's `parseWrite`, which uses the same `getWriteInstructionDataDecoder()`. (PR #90 is not
in this checkout, but the decoder is the installed library.)

## 5. Data sources and rendering

### dataSource matrix

`dataSource` (how to interpret the bytes) is orthogonal to where the bytes come from (inline arg vs buffer). In
practice only `Direct` ever uses a buffer - a URL string or an `ExternalData` pointer is tiny and fits inline.

| `dataSource` | `encoding` + `compression` apply to | Buffer account? | Data argument? |
|--------------|-------------------------------------|-----------------|----------------|
| `Direct` | the payload bytes -> the decoded string IS the content | Yes - large payloads chunked via a foreign buffer (setData) or the in-place metadata PDA (initialize) | Yes - small payloads inline |
| `Url` | the payload bytes -> the decoded string is a URL, then HTTP `fetch` | Possible but unused in practice (a URL is tiny) | Yes - inline (the URL string) |
| `External` | the FETCHED external account's bytes, NOT the pointer (the pointer is stored plain) | Possible but unused (pointer ~40B). The real content lives in a SEPARATE account fetched LIVE via `getAccountInfo` | Yes - inline (the `ExternalData` pointer `{address, offset, length}`) |

### Rendering

- `Direct` - the decoded string IS the content (P1 inline, P2/P3 reconstructed).
- `Url` - the on-chain bytes decode to a URL; fetch that URL and render its content per `format` (P4), always
  showing the source URL as a scheme-safe link. Guard the fetch: http(s)-only, size cap, timeout, graceful
  CORS/failure. Client-side cross-origin reads are often CORS-blocked, so route through the repo's server-side
  metadata proxy (`app/api/metadata/proxy`) when needed.
- `External` - the pointer resolves to a separate account (`ExternalData{address, offset, length}`, length 0 =>
  whole account); fetch it (bounded), slice, decode with `encoding`/`compression`, and render per `format` (P3).
  The fetched content is live/current-state, not point-in-time.

Per-format rendering, all inside `<pre>`/`<code>`, showing encoded + decoded side by side (raw via
`app/components/shared/HexData.tsx`):
- `Json` -> `JSON.parse` (size-capped before parse) then `JSON.stringify(obj, null, 2)`; fall back to raw string
  on parse error.
- `Yaml` / `Toml` -> verbatim (no parser lib pulled in).
- `None` -> verbatim; Encoding None yields hex (binary, not text).
- A collapsible JSON tree via `@microlink/react-json-view` (`SolarizedJsonViewer` in
  `app/components/common/JsonViewer.tsx`) is a later enhancement, not the first cut.

## 6. Risks and mitigations

Correctness:
- Reused buffer address -> unscoped replay attributes the latest lifecycle to an earlier `setData`. Fix:
  slot-scope AND session-bound (writes after the last `allocate`/`close` before this `setData`).
- Same-slot ordering is non-deterministic from `getSignaturesForAddress` -> offset-patch a fixed-size buffer
  instead of sequential append; use intra-tx ix order when writes share a tx.
- 96-byte offset: replay patches at the logical `offset` (no +96); +96 applies only to raw account slicing. Add a
  fixture that would catch a 96-byte shift.
- Decode failures degrade to `HexData`. CATCH LOCALLY inside the Decoded Content section - do NOT let the throw
  bubble to the card-level `ErrorBoundary` (`IdlInstructionCard.tsx:34`), whose fallback is `UnknownDetailsCard`
  and would discard the correctly-parsed accounts + args (swap the WHOLE card to "unknown").

Security:
- Decompression bomb: `uncompressData` runs `pako` inflate with NO output bound - a few-KB payload can inflate to
  gigabytes and freeze the tab. `pako` is in no render path today, so there is no guard to inherit. Bound it
  (chunked `pako.Inflate` aborting at ~1-2 MB) + a `data_length` pre-check; on exceed render `HexData` + a
  "payload too large" note with a download affordance.
- Untrusted content: `JSON.parse` only for `Format=Json` (size-capped); YAML/TOML/text as plain text (no parser,
  no new attack surface). Keep the no-`dangerouslySetInnerHTML` invariant. Enforce a max render size.
- Url: fetch only `http(s):` URLs (render other schemes as plain text, never fetch), cap response size, set a
  timeout, and surface CORS/network failures with the source link intact. Prefer the repo's server-side metadata
  proxy (`app/api/metadata/proxy`) over a raw client fetch - it bypasses CORS and centralizes SSRF/size controls.
  Do NOT auto-fetch on render (privacy/SSRF beacon) - fetch behind the Decode action.
- External: bound `length` BEFORE fetching (DoS), fetch via the chosen single RPC stack.

## 7. Integration and open decisions

- The section belongs on the Codama PMP card, `CodamaInstructionCard`
  (`app/features/decode-instruction-with-idl/ui/CodamaInstructionCard.tsx`), which builds its account + arg table
  INLINE. It does NOT compose `CodamaInstructionBody` (a separate, Lighthouse-only component). Gate on
  `programId == PMP` and ix in `{setData, initialize, write}`.
- Both the tx page (`app/features/transaction/ui/InstructionsSection.tsx:191`) and the inspector
  (`app/components/inspector/InstructionsSection.tsx:125`) share `useIdlInstructionDecode`, so hooking the shared
  card covers both surfaces at once.
- No reusable on-demand fetch hook exists - `AccountHistory` (`history.tsx`) is a page-scoped context/reducer, not
  callable from a card, and it uses `getParsedTransaction`. Author a new SWR hook mirroring
  `app/features/security-txt/model/useSecurityTxt.ts` (reads `url` from `useCluster()`, builds
  `new Connection(url)`).

OPEN (decide at planning):
- **FSD placement.** Candidate seams: pure `decodePmpPayload(bytes, config) -> string` and
  `reconstructBuffer(writes, dataLength) -> bytes` (RPC-free, unit-testable) in an entity or `shared/lib`; the SWR
  fetch hook + UI section in a dedicated feature slice; keep the generic Codama card PMP-free (branch to a PMP
  section/card) vs coupling one protocol into the program-agnostic card. NOTE: `app/features/metadata/` is
  Metaplex off-chain metadata, NOT PMP.
- **UI layout.** Where and how the Decoded Content section renders (placement, collapsing, the Decode button).
- **Single RPC stack.** Do not run two stacks in one feature. Either build a kit `Rpc` from the cluster url for
  Url/External and use web3 v1 `Connection` only for sig/tx paging, or hand-roll External with `Connection` +
  `unpackDirectData` and skip `unpackAndFetchData`. Direct (P1) needs no RPC at all.
- **Compute placement (client hook vs Next API route).** Where `decode/unpack` and `buffer reconstruction`
  actually run. Client (a hook over the user's cluster `Connection`): no Next.js serverless usage, respects a
  custom RPC url, but caching is local only (SWR, in-memory/per-session) so repeated views re-reconstruct.
  Server (a Next API route): can add a shared server-side cache of reconstructed buffers / decoded output
  (survives reloads, shared across users) but consumes Next.js serverless compute and must receive the
  cluster/RPC url (custom-RPC pass-through + SSRF surface). Reconstruction (RPC-heavy paging) benefits most from a
  server cache. `decode/unpack` is pure and cheap (0 RPC for Direct), so its only server draw is caching the
  output. Note the P4 Url fetch already leans server (the metadata proxy), so an API route is not new infra.

## 8. Suggested Delivery phases (P1-P4)

All four content paths are in scope. This is a delivery ordering by risk so the risky parts land isolated, not a
scope cut. Each phase is an independently shippable, reviewable unit.

- **P1 - Direct inline (0 RPC, no new deps).** `setData`/`initialize` inline decode via the typed decoders +
  `unpackDirectData`, encoded + decoded side by side. `write` shows `offset` + raw chunk. JSON pretty-print
  (size-capped), YAML/TOML/text verbatim, Encoding None -> hex. Guards baked in: decompression cap, max render
  size + hex/download fallback, LOCAL decode-error fallback to `HexData`. Housekeeping ixs render accounts only.
- **P2 - Buffer reconstruction (behind a "Decode" button).** `setData` foreign-buffer + `initialize` in-place.
  New SWR hook -> `Connection` -> `getSignaturesForAddress` + `getTransaction` (raw). Slot-scoped +
  session-bounded, offset-patched, with an explicit "reconstruction incomplete" state. Sig cap (~1000), batched
  fetch (~25) + retry/backoff + loading state. Carries the bulk of the correctness unit tests.
- **P3 - External data source.** Bounded live account fetch for `ExternalData`, on the same RPC stack as P2,
  behind the Decode button.
- **P4 - Url data source.** Decode the on-chain bytes to a URL, show it as a scheme-safe link, and fetch + render
  its content per `format` behind the Decode action. Guard the fetch (http(s)-only, size cap, timeout, graceful
  CORS/failure). Client-side cross-origin fetches are often CORS-blocked, so route through the existing
  server-side metadata proxy (`app/api/metadata/proxy`) when needed.

## 9. Testing

Follow the Lighthouse pattern (`data-testid` assertions, suite names start with "should"): build a real raw
`setData` ix from on-chain bytes, decode through the real pipeline, assert the rendered `<pre>`. A ready fixture
exists in `app/features/decode-instruction-with-idl/ui/__stories__/IdlInstructionCard.stories.tsx`. Factor
`reconstructBuffer(writes) -> bytes` and `decode(config, bytes) -> string` as RPC-free pure functions and unit-test
them directly: out-of-order, overlapping, gap, reused-buffer, truncated-history, 96-byte-shift, and
decompression-cap fixtures. Mock `Connection` for the SWR hook.

## 10. Analytics (GA)

Intent + constraints only - the concrete module and final event names/params are fixed at planning/implementation.

Goal: measure whether people use the decoded-content feature. Fire GA events through the shared
`trackEvent(name, params)` (`app/shared/lib/analytics`), mirroring the feature-local analytics module pattern
(`app/features/idl/interactive-idl/lib/analytics.ts`, and shared `refresh.ts`/`receipt.ts`).

Events (names/params final at implementation):
- `pmp_decode_clicked` - user clicks "Decode" (P2/P3/P4). Params: `instruction`, `source`.
- `pmp_decode_completed` - decode/reconstruction/fetch resolves. Params: `instruction`, `source`, `format`,
  `outcome`. The `source` (`inline` vs `buffer`/`external`/`url`) distinguishes "just parsed" from "reconstructed".

Test by mocking `trackEvent` and asserting the event name + params.
