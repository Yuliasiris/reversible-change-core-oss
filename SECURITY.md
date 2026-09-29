# Security boundary

This is pure data transformation, not authorization. A valid ChangeSet can still
be unauthorized or musically inappropriate. The host must check trusted current
source/revision, allowed scope, target writer, user action and privacy policy.
The core's checks cannot authenticate caller-supplied identity or approval.

Public apply/inverse operations validate deserialized envelope consistency as
well as the target preimage. Do not bypass these operations with raw assignments.
Reserved keys, malformed paths and non-JSON values are rejected. No parser,
network, persistence, file reader or renderer exists in this core.

Bound payload bytes, nesting depth and operation counts before invocation.
The recursive implementation has no built-in execution budget and is not a defense
against CPU/memory denial of service. Live objects with hostile Proxy traps are not
supported input. Parse bounded JSON before reaching this interface.

The checksum manifest does not establish publisher identity. Trust an external
source/pin and keep immutable release bytes. Existing saved data must survive
software rollback; never substitute an older data snapshot.

## Reporting a vulnerability

Use GitHub's **Security → Report a vulnerability** flow for this repository.
Do not disclose sensitive vulnerability details or private project data in a public
issue. If the private reporting flow is unavailable, avoid public disclosure until
a private maintainer channel is available.

The release qualification described in README.md is scoped to the documented
version; it is not a broader platform security certification.
