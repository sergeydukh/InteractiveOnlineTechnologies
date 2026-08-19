# ADR 001: domain API services with an encapsulated transport

## Status

Accepted.

## Decision

UI uses Page/Component Objects. API uses domain service objects composed by fixtures. A single `HttpTransport` owns access-key, Bearer and Basic authentication, JSON parsing, and conversion to `ApiResult<T>`. Zod validates successful and error responses at that boundary.

Tests receive `AppApi`, not the transport. Negative tests call the same domain method with a different session or configured API variant; no `raw` escape hatch exists.

## Consequences

- Auth and endpoint mechanics cannot leak into specs.
- Services have one reason to change: their domain contract.
- A service can be added without modifying existing services.
- Constructor injection is sufficient; a DI container and interface for every class would add ceremony without a current substitution need.
- Assertions remain visible in tests.
