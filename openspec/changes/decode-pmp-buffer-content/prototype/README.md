# Throwaway prototype: PMP buffer reconstruction

Not production code. Not part of the change deliverable. Delete before merging, or move the parts that survive into
`app/`. It exists to answer one question the spec cannot answer on its own: does the reconstruction algorithm in
`design.md` §4.2 actually hold up against the fixture list in `design.md` §9?

Run it:

```bash
node openspec/changes/decode-pmp-buffer-content/prototype/test/run.mjs      # algorithm fixtures
node openspec/changes/decode-pmp-buffer-content/prototype/test/probe.mjs    # library assumptions
```

Plain node ESM, zero config, no RPC. The only dependency is the already-installed
`@solana-program/program-metadata` (real decoders, so the instruction-shape claims are exercised for real) and
`pako`.

## What it contains

- `src/decode-ix.mjs` - config + `write` parsing over the REAL library decoders, including the 4-byte `setData` guard.
- `src/anchor.mjs` - two implementations side by side:
  - `deriveLengthAsDesigned` - `design.md` §4.2 read literally (`pickAnchor` picks one anchor, best first).
  - `deriveLength` - the corrected version: a forward size replay is a LOWER bound, the rent-exempt balance is the
    only UPPER bound, and a length counts as pinned only where the two meet.
- `src/assemble.mjs` - offset-patch in execution order, range classification, coverage check.
- `src/replay.mjs` - the driver: sort, slot/session scoping, forward size simulation, balance collection.
- `src/inflate.mjs` - `design.md` §3 `boundedUncompress`, copied verbatim, plus a corrected version.
- `test/run.mjs` - the `design.md` §9 fixture list, plus fixtures for the holes found.
- `test/probe.mjs` - the library-behaviour probe. Not a fixture runner: it executes the assumptions `design.md`
  makes about the installed `@solana-program/program-metadata@0.7.0` and `pako@2.1.0` and prints what actually
  happened, marking each divergence. It deliberately calls the functions the doc's own snippets call, notably kit's
  `unwrapOption`, rather than the local `unwrap` in `src/decode-ix.mjs`, because that local helper routes around a
  defect in the doc's snippet and would hide it.

Both `replay` axes are separately switchable (`mode` for ordering/scoping, `anchorMode` for length derivation), so a
fixture can isolate an anchor defect from a replay defect.

## What it establishes

Each fixture prints `PASS`/`FAIL` against the outcome `design.md` §9 says it should produce. The fixtures named
`hole:` are cases where the design as written returns `complete` for a payload that is NOT complete.

`run.mjs` is 66 checks, `probe.mjs` reports 4 library assumptions that differ from the doc:

- `unwrapOption(None)` returns `null`, so `parseWrite`'s `inline === undefined` is dead and the sourceBuffer shape is
  never detected (same idiom at `design.md` 388 and 458).
- `some(new Uint8Array(0))` and `none()` encode to the same 5 bytes, so account index 2 is the only way to tell a
  sourceBuffer write from a zero-length inline write.
- After the cap throw `inflator.result` is `undefined` while `chunks` still holds data, so the catch path must not
  read `result`.
- Neither `chunks` nor `options` is in `@types/pako`, so `design.md` §3's snippet does not compile as written.
