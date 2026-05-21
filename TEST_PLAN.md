# Test Plan and Coverage Notes

## Goal

This project covers the recruitment QA application with Playwright and TypeScript tests. The suite checks the main user-facing flows, important API contracts, access-key protection, admin visibility, and internal analytics events described in the task.

## Test Strategy

The suite is split into four practical layers:

- `smoke` - fast availability checks for login, registration, dashboard, profile, and admin pages.
- `api` - direct REST checks for auth, profile, todos, tags, admin overview, analytics access, and `X-Access-Key` protection.
- `ui` - browser checks for registration, login validation, profile mutations, todo lifecycle, tags, and admin login validation.
- `integration` - mixed UI + API checks where the UI action is verified through API/admin state or analytics events.

The suite uses a hybrid test data strategy. Lightweight scenarios can create unique users or generated entities, while heavier authenticated flows may reuse a cached authenticated user/session created during global setup. This reduces pressure on registration and login endpoints in the shared remote environment.

The target app appears to have auth/rate-limit sensitivity, so the suite currently runs with `workers: 1`. This is a conservative choice for stability during a test assignment. With a proper cleanup API and less shared server state, the suite could be safely parallelized later.

## Data Strategy Tradeoff

Full user isolation is the cleanest model for automated tests, but it creates many accounts and puts extra load on auth/register endpoints. In this assignment the application is a shared remote target and does not expose cleanup endpoints, so the suite balances isolation and backend pressure.

The current approach keeps data unique where it matters most for assertions: emails, todo titles, tag names, profile names, and analytics event predicates. For heavier authenticated flows, the cached user/session can be reused to reduce the risk of rate limiting. The downside is that these flows are not perfectly isolated, so the suite is kept sequential and avoids relying on static shared data.

If this were a long-lived production-grade suite, I would request or add cleanup endpoints and run teardown after every test. That would allow returning to stricter per-test user isolation without overloading the backend.

I also documented a stricter shared-user alternative in `docs/alternative-shared-user-strategy.md`. I did not implement it as a second test suite because that would duplicate coverage without solving the missing cleanup API problem.

## Architecture

- `playwright.config.ts` defines projects, reporters, retries, single-worker execution, shared `baseURL`, and the `X-Access-Key` browser/API header.
- `config/appConfig.js` is the single source for the application URL. It supports `BASE_URL` override for local runs and CI.
- `utils/secrets.ts` loads secrets from `.env`, legacy `sicret.json`, or environment variables.
- `global-setup.ts` creates and caches authenticated storage state.
- `fixtures/index.ts` provides typed fixtures for API client, authenticated users, page objects, and browser contexts.
- `pages/*` contains Page Object classes for login, registration, dashboard, profile, and admin screens.
- `utils/apiClient.ts` wraps common API calls and analytics polling.
- `utils/testData.ts` generates unique users, emails, todos, tags, and temporary avatar files.
- `.github/workflows/playwright.yml` allows manual CI runs with fresh application credentials and selected test layer.

## Covered Test Cases

| ID | Layer | Area | Coverage |
| --- | --- | --- | --- |
| TC-001 | Smoke | Login page | Login page loads and shows email, password, and submit controls. |
| TC-002 | Smoke | Registration page | Registration page loads and shows required form controls, including analytics consent. |
| TC-003 | Smoke | Dashboard | Authenticated shared user can open dashboard and see todo controls and filters. |
| TC-004 | Smoke | Profile | Authenticated shared user can open profile and sees readonly email. |
| TC-005 | Smoke | Admin | Admin credentials open admin panel with users and search controls. |
| TC-006 | API | Auth | Unique user can register, login, receive user role and token, then logout. |
| TC-007 | API | Auth negative | Invalid login returns `400` and `Invalid credentials`, not a server error. |
| TC-008 | API | Access key security | Protected auth endpoint rejects requests without `X-Access-Key`. |
| TC-009 | API | Profile | User profile can be read and updated: name, gender, analytics consent. |
| TC-010 | API | Password | Password mismatch returns `400`; valid password change allows login with new password. |
| TC-011 | API | Todos | Todo can be created, updated, listed by search, and deleted. |
| TC-012 | API | Tags | Tag palette is available; tag can be created, searched, and deleted. |
| TC-013 | API | Admin overview | Admin can find a unique user by email. |
| TC-014 | API | Analytics access | Analytics events endpoint returns valid event shapes with both auth schemes. |
| TC-015 | API | Analytics auth negative | Analytics endpoint rejects missing Basic Auth or missing `X-Access-Key`. |
| TC-016 | UI | Registration | Unique user can register through UI and land on dashboard; profile reflects submitted data. |
| TC-017 | UI | Registration validation | Registration cannot be submitted without required analytics consent. |
| TC-018 | UI | Login negative | Wrong credentials keep user on login page and return a client error. |
| TC-019 | UI | Profile | User can update name, gender, and analytics consent; saved values persist. |
| TC-020 | UI | Password | Mismatched passwords show inline validation; matching passwords are accepted. |
| TC-021 | UI | Avatar | User can upload an avatar image and the displayed image changes. |
| TC-022 | UI | Todos | User can create, complete, edit, and delete a todo through dashboard UI. |
| TC-023 | UI | Tags | User can create a tag and assign it to a new todo. |
| TC-024 | UI | Admin negative | Wrong admin password does not open the admin panel. |
| TC-025 | Integration | Profile UI + API | Profile update through UI is persisted and verified through API. |
| TC-026 | Integration | Todos UI + API | Todo lifecycle through UI is reflected in API state. |
| TC-027 | Integration | Admin UI + API | Admin search finds a user created through API. |
| TC-028 | Integration | Analytics flow | UI registration/login/logout and todo/profile mutations create expected analytics events. |

## Why This Coverage

The task does not require exhaustive coverage, so I prioritized user journeys that combine meaningful business behavior with high regression value:

- authentication and access protection;
- profile state and password changes;
- todos and tags as the main dashboard functionality;
- admin visibility into users;
- internal analytics, because it has a special authorization model and many event types;
- mixed UI + API checks where UI-only assertions would be too weak.

## Known Limitations

- Some tests create accounts and do not delete them because no cleanup endpoint is described in the assignment.
- Heavy authenticated flows can reuse cached auth state to reduce backend pressure and avoid rate limiting.
- Analytics tests depend on eventual event delivery and therefore poll the analytics API.
- The suite is intentionally single-worker for stability against a shared remote environment.
- Some UI checks still rely on current Russian/English app copy where the application exposes no better machine-readable state.

## Future Improvements
- Add ESLint and Prettier to enforce consistent style and catch unused locators/imports before CI.
- Request or add cleanup API endpoints, for example delete test user by email, delete todos/tags for a user, and purge analytics events by test run ID.
- Add `afterEach` cleanup in fixtures once cleanup endpoints exist, so every test removes users and related data after execution.
- Expand negative coverage for authorization boundaries, profile validation, todo/tag validation, and admin-only access.
