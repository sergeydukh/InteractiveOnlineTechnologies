# ADR 002: test-scoped actors on a shared rate-limited environment

## Status

Accepted.

## Decision

Every mutating scenario gets a unique actor. Read-only smoke and admin sessions may be worker-scoped but cannot be mutated. Actor identity contains run, project, worker and test markers.

The target API cannot delete users or analytics events. Teardown therefore removes all todos and then tags belonging to the actor. Accounts remain diagnosable by their email marker.

Functional operations are never retried. Actor provisioning may retry once only after `429` with a valid server `Retry-After` value. There are no fixed backoff arrays.

Back-to-back runs have produced a `Retry-After` longer than 660 seconds. Provisioning therefore has a separate 1,000-second orchestration timeout to accommodate the environment's rate-limit window. This is a timeout ceiling, not a fixed delay: the actual wait is always the server-provided value, and one budget is shared by registration and login.

## Consequences

- Tests do not depend on order or a shared mutable profile.
- The shared environment remains sequential: one worker and one shard.
- Sharding is deferred until a dedicated environment or independent access key per shard exists.
- Cleanup failures are visible and cannot silently pollute the environment.
