# Alternative Shared User Strategy

This document describes a stricter shared-user strategy that I would consider for a long-lived automated test suite.

The current project uses a hybrid strategy: generated data where it is important for assertions, plus cached authenticated state for heavier flows that would otherwise put too much pressure on registration/login endpoints. That is a practical compromise for this assignment because the public task does not describe cleanup endpoints for deleting users, todos, tags, profile state, or analytics events.

## Idea

Use one prepared admin account and one prepared regular user account for a group of tests. Each test starts from a known baseline and restores that baseline after execution.

Example baseline:

- admin account exists and is used only for admin checks;
- regular user exists and has a known password;
- regular user has default profile values;
- regular user has no todos and no custom tags;
- regular user has a known analytics consent state;
- optional test run ID is used for data created during the run.

## Why This Can Be Useful

- Less account buildup in the test environment.
- Faster setup because most tests do not need to register a new user.
- Lower pressure on auth/register endpoints in a rate-limited shared environment.
- Easier investigation for some failures because the same user can be inspected after a failed run.
- Closer to teams that maintain seeded test accounts in staging environments.

## Main Risk

Without reliable cleanup, tests become order-dependent.

Examples:

- one test changes the shared user's password and the next test cannot log in;
- one test disables analytics consent and analytics tests stop producing events;
- one test leaves todos/tags behind and list/search assertions become polluted;
- one test uploads or removes an avatar and profile tests start from an unexpected state;
- a failed test may skip manual cleanup and break the next run.

That is why this strategy needs explicit cleanup support. Without it, a hybrid approach or per-test generated users are usually more reliable.

## Required Cleanup API

I would request or add test-only cleanup endpoints such as:

- delete user by email or by test run ID;
- reset user password;
- reset profile fields and analytics consent;
- delete all todos for a user;
- delete all tags for a user;
- delete avatar or reset avatar to default;
- purge analytics events by user email or test run ID.

These endpoints should be available only in non-production environments and protected with service/test credentials.

## Example Fixture Shape

This is intentionally not implemented in the current suite because the target API contract does not expose cleanup operations.

```ts
test.beforeEach(async ({ api, sharedUser }) => {
  await api.resetUserState(sharedUser.email);
  await api.deleteTodosForUser(sharedUser.email);
  await api.deleteTagsForUser(sharedUser.email);
  await api.setAnalyticsConsent(sharedUser.email, true);
});

test.afterEach(async ({ api, sharedUser }) => {
  await api.resetUserState(sharedUser.email);
  await api.deleteTodosForUser(sharedUser.email);
  await api.deleteTagsForUser(sharedUser.email);
});
```

For tests that intentionally verify registration, password change, or analytics event creation, I would still prefer generated users or a dedicated generated email because those flows are naturally stateful and should not mutate a shared account used by unrelated tests.

## When I Would Use This

I would use the shared-user strategy when:

- the environment is dedicated to automated tests;
- cleanup endpoints or direct test database cleanup are available;
- tests can reset state quickly and reliably;
- parallel execution can isolate data by test run ID or worker ID.

## When I Would Avoid This

I would avoid this strategy when:

- the environment is shared with other candidates or testers;
- no cleanup API exists;
- analytics/history data cannot be purged;
- tests need to run safely in any order;
- the suite is evaluated by an external reviewer who cannot reset server state.

## Decision for This Project

For this assignment, the hybrid strategy is the better default. It keeps assertion data unique where possible, while avoiding unnecessary pressure on backend auth endpoints. I would switch to a stricter shared-user strategy only after the application exposes reliable cleanup support.
