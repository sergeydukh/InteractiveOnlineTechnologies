# MediaMarsLab recruitment app — risk-based test plan

## Current scope

The plan targets the current QA product at `https://qa-a.recruitment.mediamarslab.com`. It covers authentication, user profiles, todos, tags, administration and internal analytics through API, Chromium UI, cross-browser smoke and focused integration scenarios.

Current automated inventory:

| Layer       | Unique scenarios | Normal regression | Separate known-defect lane |
| ----------- | ---------------: | ----------------: | -------------------------: |
| Unit        |               36 |                36 |                          0 |
| API         |               15 |                13 |                          2 |
| Smoke       |                6 |                 6 |                          0 |
| UI          |               10 |                 9 |                          1 |
| Integration |                7 |                 7 |                          0 |

The normal remote regression therefore contains 35 scenarios. Three expected product failures are excluded from it and run only through `npm run test:known-defects`. Cross-browser smoke repeats the six smoke scenarios in Chromium, Firefox and WebKit (18 browser executions).

## Product invariants

1. Every API except `POST /api/applications` requires `X-Access-Key`.
2. User resources require a user session; admin resources require the admin role.
3. Todos and tags are the primary user value and must preserve ownership and relationships.
4. Profile changes must persist without allowing email mutation or inconsistent password state.
5. Internal analytics must follow consent and requires access key plus Basic Auth for retrieval.
6. Tests must not depend on execution order; shared resource actors must be empty at every test boundary.

## Traceability

| Risk                      | Automated scenario                                                             | Layer              | Execution target                  |
| ------------------------- | ------------------------------------------------------------------------------ | ------------------ | --------------------------------- |
| Access-key bypass         | Missing and malformed key before credential evaluation                         | API                | `api`, `all`                      |
| Session bypass            | Missing bearer on profile, todos, tags and admin                               | API                | `api`, `all`                      |
| RBAC failure              | Admin succeeds; user receives 403; anonymous receives 401                      | API/UI             | `api`, `ui`, `all`                |
| Broken registration/login | User role, photo, duplicate email, invalid credentials, logout and consent     | API/UI             | `api`, `ui`, `all`                |
| Invisible auth failure    | API error must be rendered to the user                                         | UI known defect    | `known-defects`                   |
| Todo data loss            | CRUD, search/status/tag filters, pagination, ownership and boundaries          | API/Integration    | `api`, `integration`, `all`       |
| Broken user flow          | UI create/complete/edit/delete, reload and pagination persisted                | Integration        | `integration`, `all`              |
| Tag corruption            | Palette, create/ensure/delete, search, assignment and detachment               | API/Integration    | `api`, `integration`, `all`       |
| Profile corruption        | Editable fields, immutable email, password transition and valid avatar         | API/UI/Integration | `api`, `ui`, `integration`, `all` |
| Analytics compliance      | Dual auth, 11 lifecycle events, 24h window and consent stop/resume             | API/Integration    | `api`, `integration`, `all`       |
| Admin visibility          | Login/logout, search, pagination, todos/events and JSON modal                  | API/Integration    | `api`, `integration`, `all`       |
| Browser compatibility     | Critical public, user and admin controls in Chromium, Firefox and WebKit       | Smoke              | Main push, manual `smoke`         |
| Secret containment        | Exact-origin API route policy plus report scan before remote artifact upload   | Unit/CI            | Push/PR checks, every remote run  |
| Credential side effects   | Vacancy form availability without application submission                       | Smoke/manual       | Main push, `smoke`, `all`         |
| Framework regression      | Config, transport auth, services, retry budgets, cleanup and artifact scanning | Unit               | Every push and PR                 |

## Layer rules

- API specs use only domain services and assert status/contracts/boundaries.
- UI specs use Page/Component Objects and assert visible browser behaviour.
- Integration specs combine UI with one meaningful API or analytics assertion.
- Tests never call `fetch`, Playwright's request fixture, transport methods, or construct auth headers.
- Assertions live in tests or the typed test assertion helper, never in API clients or Page Objects.
- `POST /api/analytics/register|login|logout` remains a characterization backlog item until its payload is documented.
- The vacancy application is never submitted by automation because it returns one-time credentials.
- XSS, MIME spoofing, oversized/malformed payloads, accessibility, responsive/visual and load checks are out of scope.

## Data and failure policy

- Resource-only CRUD and ownership tests use freshly provisioned worker-scoped owner and secondary actors. They are cleaned after every test; cleanup failure restarts the worker before another test can reuse state.
- Password-contract mutations receive isolated actors with run/project/worker/test metadata. Compatible UI/profile scenarios, analytics integration, and ownership checks reuse separate purpose-specific worker actors.
- Read-only smoke actor and admin session are worker-scoped and immutable. Smoke intentionally leaves one account per browser project/run.
- Teardown removes todos before tags; accounts and analytics events cannot be deleted.
- Teardown first verifies the exact actor profile and refuses deletion for an unmarked or mismatched user.
- Functional mutations and smoke setup are never retried; traces are disabled.
- Actor setup retries once only for explicit `429 + Retry-After` within a 30-second total setup budget; longer delays fail fast.
- Guarded cleanup has a 30-second total budget and bounded todo passes. It may retry only idempotent cleanup reads and DELETE operations after explicit `429 + Retry-After`, stops before tags if todo cleanup is incomplete, and never repeats a test action.
- Analytics presence uses bounded polling; absence uses a full bounded observation window.

## Execution and CI model

| Event                               | Automated scope                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------- |
| Push to any branch                  | Format-independent framework checks: lint, typecheck and 36 unit tests             |
| Pull request to `main`              | Formatting, lint, typecheck, unit coverage and Playwright discovery; no QA secrets |
| Push to `main`                      | 18 cross-browser smoke executions                                                  |
| Manual `smoke`, `api` or `ui`       | Selected remote suite                                                              |
| Manual `integration`                | Observability (4), user flows (2), then pagination (1), serially                   |
| Manual or deployment-dispatch `all` | Core regression (28), then the same three serial integration groups (7)            |
| Manual `known-defects`              | Three isolated expected failures                                                   |

All remote jobs use the protected `qa` environment, one worker, one shard and zero Playwright retries. Integration groups use fresh hosted runners with `max-parallel: 1` so mutation suites do not compete against the shared environment's request limits. Reports are scanned for configured secret values before upload.

## Manual checks

- Vacancy application creates and reveals credentials once.
- Configure the resulting credentials in GitHub Environment `qa`.
- Rotate credentials manually and update local `.env` plus the protected GitHub Environment `qa` together.
- Keep branch protection for `main` configured to require the quality job, one approval and dismissal of stale approvals.
