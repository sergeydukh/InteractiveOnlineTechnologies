# Risk-based test plan

## Product invariants

1. Every API except `POST /api/applications` requires `X-Access-Key`.
2. User resources require a user session; admin resources require the admin role.
3. Todos and tags are the primary user value and must preserve ownership and relationships.
4. Profile changes must persist without allowing email mutation or inconsistent password state.
5. Internal analytics must follow consent and requires access key plus Basic Auth for retrieval.
6. Tests must not depend on execution order; shared resource actors must be empty at every test boundary.

## Traceability

| Risk                      | Automated scenario                                                      | Layer              | CI lane       |
| ------------------------- | ----------------------------------------------------------------------- | ------------------ | ------------- |
| Access-key bypass         | Missing and malformed key before credential evaluation                  | API                | remote API    |
| Session bypass            | Missing bearer on profile, todos, tags, admin                           | API                | remote API    |
| RBAC failure              | Admin succeeds; user receives 403; anonymous receives 401               | API/UI             | remote API/UI |
| Broken registration/login | User role, photo, duplicate email, invalid credentials, logout, consent | API/UI             | remote API/UI |
| Invisible auth failure    | API error must be rendered to the user                                  | UI known defect    | full          |
| Todo data loss            | CRUD, search/status/tag filters, pagination, ownership, boundaries      | API/Integration    | full          |
| Broken user flow          | UI create/complete/edit/delete, reload and pagination persisted         | Integration        | full          |
| Tag corruption            | Palette, create/ensure/delete, search, assignment/detachment            | API/Integration    | full          |
| Profile corruption        | Editable fields, readonly email, password transition, avatar            | API/UI/Integration | full          |
| Analytics compliance      | Dual auth, all 11 event types, 24h window, consent stop/resume          | API/Integration    | full          |
| Admin visibility          | Login/logout, search, pagination, todos/events and JSON modal           | API/Integration    | full          |
| Browser compatibility     | Public, user and admin critical controls                                | Smoke              | main push     |
| Secret containment        | Exact-origin API route policy and artifact scan                         | Unit/CI            | every lane    |
| Credential side effects   | Vacancy form availability without application submission                | Smoke/manual       | deploy/manual |
| Framework regression      | Config, transport auth, contracts, setup retry, cleanup, storage state  | Unit               | every PR      |

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

## Manual checks

- Vacancy application creates and reveals credentials once.
- Configure the resulting credentials in GitHub Environment `qa`.
- Rotation is manual. Retaining the current key is an accepted risk after the previous context-wide header configuration.
- Make the repository public and verify the link in an unauthenticated browser.
- Configure branch protection for `main` after the first successful quality workflow.
