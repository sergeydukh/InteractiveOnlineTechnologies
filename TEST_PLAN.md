# Risk-based test plan

## Product invariants

1. Every API except `POST /api/applications` requires `X-Access-Key`.
2. User resources require a user session; admin resources require the admin role.
3. Todos and tags are the primary user value and must preserve ownership and relationships.
4. Profile changes must persist without allowing email mutation or inconsistent password state.
5. Internal analytics must follow consent and requires access key plus Basic Auth for retrieval.
6. Tests must not depend on execution order or mutable worker-scoped users.

## Traceability

| Risk                      | Automated scenario                                                     | Layer              | CI lane       |
| ------------------------- | ---------------------------------------------------------------------- | ------------------ | ------------- |
| Access-key bypass         | Missing and malformed key before credential evaluation                 | API                | remote API    |
| Session bypass            | Missing bearer on profile, todos, tags, admin                          | API                | remote API    |
| RBAC failure              | Admin succeeds; user receives 403; anonymous receives 401              | API/UI             | remote API/UI |
| Broken registration/login | User role, duplicate email, invalid credentials, mandatory consent     | API/UI             | remote API/UI |
| Invisible auth failure    | API error must be rendered to the user                                 | UI known defect    | full          |
| Todo data loss            | CRUD contract, filters, ownership, title boundaries                    | API                | remote API    |
| Broken user flow          | UI create/complete/edit/delete persisted through API                   | Integration        | full          |
| Tag corruption            | Palette, create, duplicate/length, assignment/filter                   | API/Integration    | full          |
| Profile corruption        | Editable fields, readonly email, password transition, avatar           | API/UI/Integration | full          |
| Analytics compliance      | Dual auth, runtime event contract, consent stop/resume                 | API/Integration    | full          |
| Admin visibility          | Search/no-results and API-created user visible in UI                   | API/Integration    | full          |
| Credential side effects   | Vacancy form availability without application submission               | Smoke/manual       | deploy/manual |
| Framework regression      | Config, transport auth, contracts, setup retry, cleanup, storage state | Unit               | every PR      |

## Layer rules

- API specs use only domain services and assert status/contracts/boundaries.
- UI specs use Page/Component Objects and assert visible browser behaviour.
- Integration specs combine UI with one meaningful API or analytics assertion.
- Tests never call `fetch`, Playwright's request fixture, transport methods, or construct auth headers.
- Assertions live in tests or the typed test assertion helper, never in API clients or Page Objects.
- `POST /api/analytics/register|login|logout` remains a characterization backlog item until its payload is documented.

## Data and failure policy

- Every mutating test receives a new actor with run/project/worker/test metadata.
- Read-only smoke actor and admin session are worker-scoped and immutable.
- Teardown removes todos before tags; accounts and analytics events cannot be deleted.
- Functional mutations are never retried.
- Actor setup retries once only for explicit `429 + Retry-After`.
- Analytics presence uses bounded polling; absence uses a full bounded observation window.

## Manual checks

- Vacancy application creates and reveals credentials once.
- Configure the resulting credentials in GitHub Environment `qa`.
- Make the repository public and verify the link in an unauthenticated browser.
- Configure branch protection for `main` after the first successful quality workflow.
