# MediaMarsLab Playwright QA framework

Playwright/TypeScript framework for the recruitment todo application. The suite is intentionally risk-based: API tests own contract variants, UI tests own browser behaviour, and integration tests exist only where a cross-layer assertion adds information.

## Architecture

```text
tests
  └─ fixture composition
       ├─ api.fixture → AppApi → domain services → HttpTransport
       ├─ actor.fixture → shared / isolated / secondary actors
       ├─ browser.fixture → first-party routing and application contexts
       └─ pages.fixture → UI pages/components → Playwright Page
```

- Page Objects are used only for browser UI. There is no common base class or hidden navigation retry.
- API calls go through domain services. Specs cannot access the transport and never build authorization headers.
- `ApiResult<T>` keeps HTTP status and separates validated success data from typed API errors.
- Zod validates external JSON at the API boundary.
- Fixtures assemble all dependencies and keep secrets out of tests.
- Browser routing adds `X-Access-Key` only to the configured first-party `/api/**` origin.
- Purpose-scoped worker actors are freshly provisioned and cleaned after every test. A failed cleanup restarts the worker, so the next test receives a new actor. Password-contract and analytics mutations remain isolated from resource scenarios.
- User cleanup is impossible because the supplied API has no user-delete endpoint; generated emails contain a test-run marker.

The architectural rationale is recorded in [ADR 001](docs/adr/001-api-boundaries.md), [ADR 002](docs/adr/002-test-data-isolation.md), and [ADR 003](docs/adr/003-first-party-access-key.md). Product gaps are recorded in [KNOWN_ISSUES.md](KNOWN_ISSUES.md).

## Configuration

Prerequisites: Node.js 22+, npm, and the three Playwright browser engines for cross-browser smoke.

```bash
npm ci
npx playwright install chromium firefox webkit
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
npm run unit:coverage            # enforced 80/75 framework coverage thresholds
npm run test:smoke               # Chromium deployment signal
npm run test:api
npm run test:ui
npm run test:integration
npm run test:known-defects          # expected product failures in a separate lane
npm test                         # complete Chromium suite
npm run test:cross-browser-smoke # Chromium, Firefox, WebKit
npm run artifacts:scan           # reject reports containing configured secrets
```

Functional and smoke runs never retry because actor setup mutates the shared environment. Traces are disabled so authorization headers cannot be retained in uploaded trace archives. Failure screenshots and videos remain enabled and reports are scanned for configured secret values before upload.

## Credential and actor model

- `X-Access-Key` identifies the vacancy application / QA environment and is shared by the suite.
- Issued admin credentials create a worker-scoped, read-only admin session.
- Purpose-specific owner and secondary resource actors are worker-scoped; guarded cleanup runs after each test, and a worker restart provisions fresh actors after any failure.
- A purpose-specific analytics actor is worker-scoped and reused only by analytics integration scenarios; guarded resource cleanup runs after each test.
- Isolated actors remain limited to auth and profile scenarios that mutate credentials or profile state across different contracts.
- Authenticated smoke creates one immutable user per browser project and run.

Because the product has no account-delete endpoint, the current commands leave these marked QA accounts behind (todos and tags are still cleaned):

| Command                            | Accounts left per run |
| ---------------------------------- | --------------------: |
| `npm run test:smoke`               |                     1 |
| `npm run test:cross-browser-smoke` |                     3 |
| `npm run test:api`                 |                     5 |
| `npm run test:ui`                  |                     3 |
| `npm run test:integration`         |                     2 |
| `npm test`                         |                    11 |
| `npm run test:known-defects`       |                     2 |

These counts match the present test inventory: compatible profile/UI scenarios reuse a guarded purpose-scoped actor, registration scenarios include users created directly through UI/API, and CRUD integration scenarios share one guarded worker actor.

The access key is never generated by CI. The current key is intentionally retained, although the former context-wide header configuration may have exposed it to third-party asset hosts. Rotation remains manual: submit the vacancy form once, save every issued value immediately, update `.env` and the protected GitHub Environment `qa`, then invalidate the previous credentials if supported.

## Test lifecycle

1. A fixture selects a freshly provisioned worker actor or creates a uniquely marked isolated user and logs in through `AuthApi`.
2. API services or a browser context receive the typed session.
3. The test performs one risk-focused scenario.
4. Teardown re-reads the profile, verifies the exact marked actor, then repeatedly deletes the first todo page until empty and deletes tags only after todo cleanup succeeds.
5. Cleanup failure fails an otherwise successful test or is attached to the original failure.

`429` is never retried for functional actions. Actor setup may retry once only for a valid `Retry-After` that fits its 30-second total budget; a longer server delay fails fast. Cleanup has its own 30-second total budget and retries only idempotent todo/tag DELETE operations. It never reruns the test action, never loops forever, and never starts tag deletion after an incomplete todo cleanup.

Negative login status is verified against the real API only where the contract or analytics scenario requires it. UI error-rendering and admin-panel rejection use a browser-level API stub, so browser runs test frontend responsibility without consuming the shared environment's failed-login quota.

The user UI logout scenario calls the real endpoint and verifies local session removal, login redirect, and rejection on a subsequent dashboard visit. Bearer-token invalidation is exercised separately in the API known-defect scenario.

## CI and review

- Pull requests to `main` run a secret-free quality gate.
- Every push runs framework lint, TypeScript typechecking, and unit tests without remote QA credentials or browsers.
- Pushes to `main` run sequential Chromium/Firefox/WebKit smoke. Full mutation runs are manual or `qa-environment-deployed` only; there is no nightly schedule.
- The manual/deployment `all` target runs API + Chromium smoke + UI first, then integration as a second job connected by `needs`. Integration gets a fresh hosted runner instead of inheriting the first job's exhausted runner context, and the shared QA environment never receives concurrent mutation suites.
- QA credentials belong to the protected GitHub Environment `qa`.
- The shared environment uses one worker, one shard, and zero Playwright retries.
- Branch protection must require the quality job, one approval, and dismissal of stale approvals.

Before submission the repository must be public. At the time of this refactor the unauthenticated GitHub URL returned `404`.

## Deliberate scope boundaries

The suite covers functional ownership but is not a penetration or load test. XSS, MIME spoofing, oversized or malformed payload probes, accessibility audits, responsive and visual baselines, and load testing are intentionally excluded. Undocumented client analytics POST payloads remain backlog rather than an invented contract.
