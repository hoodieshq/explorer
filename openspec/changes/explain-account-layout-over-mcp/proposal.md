# Proposal: Explain an account's byte layout over MCP

## Context

`inspect_entity` already IDL-decodes unknown-kind accounts: it resolves the owner program's IDL and
returns the payload as `decoded.info` with `source: 'idl'`. What it cannot say is **where** any of that
sat in the raw bytes, so a caller holding both the account's base64 data and the decoded payload has no
way to relate the two.

`measure-decoded-byte-layout` added `getDecodedLayout` to `@explorer/idl-decode` for exactly this, and
named the MCP wiring as its own follow-up. This is that follow-up — the second of the two applications
`HOO-1076` lists.

## Why

The layout is a tree, and the obvious move is to return it as one. Rejected: the tool's consumer is a
model reading JSON, and a tree makes it walk nested `children` to answer "which bytes are the
authority?" — a question a flat row states outright. `flattenLayout` already produces the flat form,
and each row carries a dot `path` that indexes straight into `decoded.info`, so the nesting is still
recoverable without being traversed.

Three further choices, each trading completeness for a reply a model can actually use:

- **No values in the layout.** They are already in `decoded.info` under the same paths. Repeating them
  would roughly double the reply to say nothing new. The alternative — layout *instead of* `info` —
  would break every existing consumer and lose the nesting that makes the payload readable.
- **The schema's own vocabulary, not a friendlier one.** Rows carry `kind` (`publicKeyTypeNode`) plus
  `format` (`u64`) when the node declares one. Mapping those onto invented labels (`pubkey`, `u64`,
  `string`) would read better but puts a lossy vocabulary in the MCP layer that has to track Codama's,
  and the package's stated contract is that consumers dispatch on `node.kind`.
- **A cap with an explicit count.** A nested-array account can name hundreds of fields (amm_v3's
  `TickArrayState` reaches ~500), which would land in every reply for such an account. Rows are capped
  at 256 and the remainder is reported as `omitted`, so a truncated layout never reads as a complete
  one. Silently returning a prefix was the alternative, and it is the one that misleads. The kept rows
  are a depth-first prefix, so a big nested array can spend the cap and hide the account's own later
  fields; `omitted` is the only signal, which is why it is never omitted when anything was dropped.

**Best-effort by contract.** A layout that cannot be built returns `undefined` and the decode still
returns. The decoded payload is the tool's answer today, and a new field must not be able to take it
away — so flattening, dropping the root and capping sit inside the same guard as the walk, not after it.
A typed `IdlError` logs a warning, any other throw logs an error (it is a defect, not a schema the walk
cannot describe), and an arm that carries no layout logs nothing at all.

## What Changes

- **`decoded.layout`** on the unknown-kind account payload: `{ fields: [{ path, offset, size, kind,
  format?, docs? }], omitted? }`, absent when the schema names no field. New module
  `packages/entity-inspector/src/accounts/idl-account-layout.ts`.
- **`resolveIdlDecodedData` moves to the two-step decode.** `client.decodeAccount` + `getDecodedData`
  replace `decodeAccountData`, because the layout needs the decode envelope. The unknown arm is the
  same "could not decode" outcome the one-step route reported as an error, so the null-resolving
  behaviour is unchanged.
- **The tool description documents the field**, including that a range covers the framing the schema
  does not name, that the gap between a parent's range and its children's is that framing where the
  member has a row of its own, and that a long layout reports `omitted`.
- **The unknown arm's errors are logged.** The reply cannot distinguish "no IDL" from "the IDL did not
  fit these bytes", so a non-empty `errors` is logged rather than dropped.
- **Docs travel from the IDL.** Codama carries `structFieldTypeNode.docs`, so a field's row includes the
  program's own Rust doc comments where it declares them.

**Out of scope:** layouts for recognized account kinds (token, stake, vote, …), which decode through
bundled parsers rather than an IDL and would need hand-written offset tables; and the Account-page UI.

## Impact

- **Files:** new `src/accounts/idl-account-layout.ts` plus its spec and a codama-root test fixture;
  `src/mcp/tools/inspect-entity.ts` and `src/mcp/server.ts` touched.
- **Wire format:** additive. `decoded.info`, `decoded.source` and `decoded.program` are untouched, so
  existing consumers see no change; `bigIntReplacer` in `toToolResult` already coerces any bigint the
  new field could carry.
- **Accepted risk:** the 256-row cap is a guess at a useful ceiling, not a measured one. It is visible
  in the reply (`omitted`) and cheap to raise once real usage shows what callers ask for.
- **Test fixtures:** the codama roots are plain literals rather than `codama` node constructors, because
  this package does not depend on `codama` and a root is its JSON. They go through
  `tryCreateIdlClient`, the package's untrusted-input route, which is what unvalidated JSON deserves.
