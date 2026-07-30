# Flows: PMP buffer-content decode

High-level flows for `setData`, `initialize`, and `write`. Companion to `design.md` (§3-§5).

## The two-stage model (key insight)

Decoding is two orthogonal stages. Where the bytes come from is independent of how they are interpreted, so the
many "cases" are just `stage 1 x stage 2`:

- Stage 1 - OBTAIN the `data` bytes: inline arg (0 RPC) OR reconstruct a buffer/PDA (P2, behind the Decode button).
- Stage 2 - INTERPRET per `dataSource`: `Direct` (bytes are the content), `Url` (bytes are a URL, then fetch),
  `External` (bytes are a pointer, then fetch an account).

`encoding`/`compression` apply where the payload really lives: to the content for `Direct`, to the URL pointer for
`Url`, and to the FETCHED account bytes for `External` (the `ExternalData` pointer itself is stored plain). `format`
always applies to the final content that gets rendered.

In practice only `Direct` uses a buffer - a URL string or an `ExternalData` pointer (~40B) is tiny and fits inline.
The `Url`/`External` + buffer combinations are drawn for completeness but are unused on-chain.

### Step primitives (used in the lists below)

- `decode-ix` - decode raw ix bytes with the typed decoder (`getSetData`/`getInitialize`/`getWrite...DataDecoder`)
  into config (`encoding`, `compression`, `format`, `dataSource`) + `data` (Option bytes).
- `unpack(bytes)` - `uncompress(compression)` then `decode(encoding)` into a string. This is `unpackDirectData`.
- `reconstruct(acc)` - `getSignaturesForAddress` + `getTransaction`, replay `write` chunks offset-patched up to the
  viewed slot, into bytes (P2). Runs behind the Decode button.
- `parse-external(bytes)` - decode the `ExternalData{address, offset, length}` pointer (plain struct, no unpack).
- `fetch-account(address)` - `getAccountInfo` then slice `[offset, offset+length)` (whole account when length 0).
- `fetch-url(url)` - `fetch(url)` then read text, guarded (http(s)-only, size cap, timeout, prefer server proxy).
- `render(str, format)` - JSON pretty-print / YAML / TOML / text verbatim / hex.

Note: the SDK's `unpackAndFetchData` already encapsulates the whole stage 2 (`Direct` | `Url` | `External`) in one
call when given a kit `Rpc`. Stage 1 buffer reconstruction is ours to build.

---

## 1. `setData`

```mermaid
flowchart TD
    S["PMP setData ix"] --> DEC["decode-ix: encoding, compression, format, dataSource, data"]
    DEC --> Q1{"inline data present?"}
    Q1 -->|yes| B1["bytes = inline data arg (0 RPC)"]
    Q1 -->|no| Q2{"buffer acc idx2"}
    Q2 -->|"not PMP id"| B2["reconstruct(foreign buffer) up to viewedSlot (P2)"]
    Q2 -->|"== PMP id"| H["header-only hint update: nothing new to decode"]
    B1 --> DS{"dataSource"}
    B2 --> DS
    DS -->|Direct| D1["unpack = content"]
    DS -->|Url| U1["unpack = URL, then fetch-url = body"]
    DS -->|External| E1["parse-external, fetch-account, slice, unpack"]
    D1 --> R["render per format: JSON / YAML / TOML / text / hex"]
    U1 --> R
    E1 --> R
```

One-line action lists:

- Direct + data arg: `decode-ix` -> `unpack(data)` -> `render`. 0 RPC.
- Direct + buffer acc: `decode-ix` -> `reconstruct(buffer)` -> `unpack` -> `render`. Behind Decode button.
- External + data arg: `decode-ix` -> `parse-external(data)` -> `fetch-account` -> `unpack(slice)` -> `render`. Behind Decode.
- External + buffer acc: `decode-ix` -> `reconstruct(buffer)` -> `parse-external` -> `fetch-account` -> `unpack(slice)` -> `render`. Rare/unused.
- Url + data arg: `decode-ix` -> `unpack(data)` = URL -> `fetch-url` -> `render(body, format)`. Behind Decode, guarded.
- Url + buffer acc: `decode-ix` -> `reconstruct(buffer)` -> `unpack` = URL -> `fetch-url` -> `render`. Rare/unused.
- Header-only (data empty, buffer == PMP id): `decode-ix` -> show updated hints, nothing to decode.

---

## 2. `initialize`

Identical to `setData`, with ONE difference in stage 1: `initialize` has no foreign buffer. When `data` is empty
the payload was pre-written in place, so reconstruction targets the metadata PDA itself (`accounts[0]`).

```mermaid
flowchart TD
    S["PMP initialize ix"] --> DEC["decode-ix: seed, encoding, compression, format, dataSource, data"]
    DEC --> Q1{"inline data present?"}
    Q1 -->|yes| B1["bytes = inline data arg (0 RPC)"]
    Q1 -->|"no (in-place)"| B2["reconstruct(metadata PDA accounts[0]) up to viewedSlot (P2)"]
    B1 --> DS{"dataSource"}
    B2 --> DS
    DS -->|Direct| D1["unpack = content"]
    DS -->|Url| U1["unpack = URL, then fetch-url = body"]
    DS -->|External| E1["parse-external, fetch-account, slice, unpack"]
    D1 --> R["render per format"]
    U1 --> R
    E1 --> R
```

One-line action lists:

- Direct + data arg: `decode-ix` -> `unpack(data)` -> `render`. 0 RPC.
- Direct + in-place: `decode-ix` -> `reconstruct(metadataPda)` -> `unpack` -> `render`. Behind Decode button.
- External + data arg: `decode-ix` -> `parse-external(data)` -> `fetch-account` -> `unpack(slice)` -> `render`. Behind Decode.
- External + in-place: `decode-ix` -> `reconstruct(metadataPda)` -> `parse-external` -> `fetch-account` -> `unpack(slice)` -> `render`. Rare/unused.
- Url + data arg: `decode-ix` -> `unpack(data)` = URL -> `fetch-url` -> `render(body, format)`. Behind Decode, guarded.
- Url + in-place: `decode-ix` -> `reconstruct(metadataPda)` -> `unpack` = URL -> `fetch-url` -> `render`. Rare/unused.

---

## 3. `write`

A `write` is a fragment with NO `encoding`/`compression`/`format`, so it is never decoded to a document on the
instruction page. Show only what this instruction carries.

```mermaid
flowchart TD
    W["PMP write ix"] --> WD["decode-ix: offset u32 + data Option-bytes, accounts buffer/authority/sourceBuffer?"]
    WD --> WQ{"inline data present?"}
    WQ -->|yes| WC["show offset + raw chunk (hex/base64), no content decode"]
    WQ -->|"no + sourceBuffer set"| WS["show sourceBuffer address + note: chunk copied from another buffer, not in this ix"]
```

One-line action lists:

- Inline chunk: `decode-ix` -> show `offset` + raw chunk (hex/base64). 0 RPC. No content decode.
- From sourceBuffer (data empty, idx2 set): `decode-ix` -> show `sourceBuffer` address + note. No reconstruction here.
