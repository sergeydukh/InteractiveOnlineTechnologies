# MediaMarsLab Playwright QA framework

Playwright/TypeScript framework for the recruitment todo application. The suite is intentionally risk-based: API tests own contract variants, UI tests own browser behaviour, and integration tests exist only where a cross-layer assertion adds information.

## Architecture

```text
tests
  └─ typed fixtures (composition root)
       ├─ UI pages/components → Playwright Page
       ├─ AppApi
       │    ├─ AuthApi / ProfileApi / TodosApi / TagsApi / AdminApi / AnalyticsApi
       │    └─ HttpTransport → Playwright APIRequestContext
       └─ test-scoped actor provisioning and cleanup
```

- Page Objects are used only for browser UI. There is no common base class or hidden navigation retry.
- API calls go through domain services. Specs cannot access the transport and never build authorization headers.
- `ApiResult<T>` keeps HTTP status and separates validated success data from typed API errors.
- Zod validates external JSON at the API boundary.
- Fixtures assemble all dependencies and keep secrets out of tests.
- Mutating tests use their own actor. Teardown deletes that actor's todos before tags.
- User cleanup is impossible because the supplied API has no user-delete endpoint; generated emails contain a test-run marker.

The architectural rationale is recorded in [ADR 001](docs/adr/001-api-boundaries.md) and [ADR 002](docs/adr/002-test-data-isolation.md). Product gaps are recorded in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Configuration

Prerequisites: Node.js 22+, npm, and Chromium for remote UI runs.

```bash
npm ci
npx playwright install chromium
cp .env.example .env
```

Required remote-test variables:

```dotenv
BASE_URL=https://qa-a.recruitment.mediamarslab.com
ACCESS_KEY=<application-id.secret>
ADMIN_EMAIL=<admin-email>
ADMIN_PASSWORD=<admin-password>
ANALYTICS_BASIC_USER=<analytics-reader>
ANALYTICS_BASIC_PASSWORD=<analytics-password>
```

Secrets are loaded lazily. Static analysis, unit tests, and Playwright discovery work without `.env`.

The vacancy application is deliberately manual because it creates one-time credentials:

```bash
npm run secrets:bootstrap -- "Full Name"
```

Do not execute this command in regular CI.

## Commands

```bash
npm run check                    # PR gate: format, lint, types, unit, discovery
npm run unit                     # deterministic framework unit tests
npm run unit:coverage            # informational coverage report
npm run test:smoke               # Chromium deployment signal
npm run test:api
npm run test:ui
npm run test:integration
npm test                         # complete Chromium suite
npm run test:cross-browser-smoke # Chromium, Firefox, WebKit
```

Local runs have no retry. Remote CI allows one retry for diagnostics and retains the original failure evidence.

## Test lifecycle

1. A fixture creates a uniquely marked user and logs in through `AuthApi`.
2. API services or a browser context receive the typed session.
3. The test performs one risk-focused scenario.
4. Teardown lists and deletes todos, then tags, even when the test failed.
5. Cleanup failure fails an otherwise successful test or is attached to the original failure.

`429` is never retried for functional actions. Actor setup may retry once only when the server returns a valid `Retry-After` header.

Negative login status is verified once against the real API. UI error-rendering and admin-panel rejection use a browser-level API stub, so repeated UI runs test frontend responsibility without consuming the shared environment's failed-login quota.

## CI and review

- Pull requests to `main` run a secret-free quality gate.
- Push, manual, reusable, and `qa-environment-deployed` triggers share one remote E2E workflow.
- QA credentials belong to the protected GitHub Environment `qa`.
- The shared environment uses one worker and one shard.
- Branch protection must require the quality job, one approval, and dismissal of stale approvals.

Before submission the repository must be public. At the time of this refactor the unauthenticated GitHub URL returned `404`.
