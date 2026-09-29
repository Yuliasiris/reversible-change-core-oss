# Reversible change core

Change an existing JSON-object field with a checked preimage and a validated
inverse. Not a state store, MIDI editor, authorization service, or JSON Patch engine.

**Version: `0.1.3`. Licensed under the MIT License.**

## Run a complete example

From a checkout of this source, using Node 22 or later:

```sh
node examples/basic.mjs
```

There are no third-party runtime dependencies or install-time scripts.

```js
import { createChangeSet, applyChangeSet, applyExactInverse } from './index.mjs';

const original = { note: { duration: 4, velocity: 80 } };
const change = createChangeSet(original, {
  change_id: 'example-1', axis: 'note.duration', from: 4, to: 3,
  untouched_axes: ['note.velocity'],
}, 'example.change.v1');
const candidate = applyChangeSet(original, change);
const restored = applyExactInverse(candidate, change);
```

Each result is a new deeply frozen JSON value. Input objects are not mutated.
Shared references are copied by JSON value; object identity is not a wire guarantee.
The example uses synthetic data and makes no persistence or network calls.

## What the core checks—and what the host must check

Both apply functions validate a deserialized envelope again: JSON data, changed
axis, forward/inverse symmetry, non-overlap with untouched paths and the current
preimage of the selected field. Altering a stored inverse is not trusted.

The preimage check is **field-local**. Another document with the same field value,
or the same document at a later revision, can pass it. The module does not know
your current document, revision, approval or writer. It also preserves unrelated
newer fields; inverse is not a restoration of a whole old snapshot.

```sh
node examples/host-precondition.mjs
```

The second example shows a tampered inverse being rejected, a field-only edit
preserving newer unrelated data, and a host-side check rejecting a stale revision
or different source. The host example prepares a value synchronously; it is not
a lock, transaction, access-control system or storage write. For asynchronous
persistence, use the host's existing atomic CAS/transaction at commit time.

## Input and path contract

| Supported | Not provided |
|---|---|
| Existing plain-object paths such as `note.duration` | Array element indexing, new field creation, deletion or escaped dotted keys |
| Arrays as whole replacement values | Arbitrary JSON Patch operations |
| Finite numbers, strings, booleans, null, dense arrays and plain records | Class instances, Date, BigInt, functions, symbols, hidden fields, accessors, cycles or sparse arrays |
| Legacy valid envelope shape | Application schema meaning, source identity, musical legality or writer permission |

`__proto__`, `prototype` and `constructor` are forbidden path segments and object
keys. Null-prototype input records are data, not a promise to preserve prototypes.
Hostile JavaScript Proxies are outside this trust boundary; the host should parse
and bound external JSON before use. Read [SECURITY.md](SECURITY.md).

`stableJson` preserves the existing normalization, not RFC 8785 canonicalization.
JavaScript JSON number equality applies (`-0` serializes as `0`). “Exact” means
exact under this JSON equality, not original file bytes, all historical state,
object identity or acoustic output. The caller selects its wire schema identifier.

## Runtime and types

Node 22 or later is the tested runtime family. The module has no Node built-in
imports, but browser compatibility is not part of this release qualification.
The executable examples use Node assertions. Types are supplied in `index.d.mts`.
The repository is not configured for accidental npm publication (`private: true`).
The declarations accept readonly results as the next change's input, including
whole-array replacement values. Existing mutable `ChangeRequest` inputs remain
supported; returned values and change envelopes remain deeply readonly.

## Build and verify the exact package

```sh
npm test
# With TypeScript 5.8.3 already installed:
tsc --strict --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 test/types.test.ts test/composition.test.ts
python -m unittest -v
node examples/basic.mjs
node examples/host-precondition.mjs
python build.py ./dist
```

The source checkout includes the regression tests and builder. The runtime ZIP
includes the module, declarations, package metadata, examples, README, SECURITY,
PROVENANCE, LICENSE, and release-preparation instructions. It does not contain
the builder or tests. Use the example commands, not `npm test`, in that ZIP.
Extract it into a fresh directory and run the same examples there. No network
endpoint or install-time script is needed. Verify its checksum against an
independently trusted pin before importing code.

The builder requires Python 3.10+ and fixes member order, timestamps and platform
metadata. It refuses same-version different-byte replacement and requires the
license document. A NOTICE file, when present, is included. Changes to documentation,
license or metadata also require a new version. The source and archive are distinct objects.

## Maintenance and provenance

See [release preparation](docs/releasing.md), [security](SECURITY.md) and
[provenance](PROVENANCE.md). The public source tree is intentionally independent
of the earlier private Git history; provenance is retained separately.

Only the field/value transformation contract is provided. Host approval, source
identity, storage transactions and user decisions remain with the host.
No full application compatibility or OS/browser support matrix is implied.
