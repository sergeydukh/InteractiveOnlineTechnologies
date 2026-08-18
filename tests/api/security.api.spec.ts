import { test, expect } from '@fixtures';

const malformedUserSession = { token: 'malformed-token', role: 'user' as const };

test.describe('API security', { tag: '@api' }, () => {
  test('requires X-Access-Key before evaluating auth credentials', async ({ apiVariants }) => {
    const missing = await apiVariants.withoutAccessKey.auth.login({
      email: 'unknown@example.com',
      password: 'irrelevant-password',
    });
    const malformed = await apiVariants.malformedAccessKey.profile.get(malformedUserSession);

    expect(missing).toMatchObject({ ok: false, status: 401 });
    expect(malformed).toMatchObject({ ok: false, status: 401 });
  });

  test('requires a bearer session for user and admin resources', async ({ api }) => {
    const results = await Promise.all([api.profile.get(), api.todos.list(), api.tags.list(), api.admin.getOverview()]);

    for (const result of results) expect(result).toMatchObject({ ok: false, status: 401 });
  });

  test('requires access key and Basic Auth together for analytics', async ({ apiVariants }) => {
    const missingAccessKey = await apiVariants.withoutAccessKey.analytics.getEvents();
    const missingBasic = await apiVariants.withoutAnalyticsBasic.analytics.getEvents();

    expect(missingAccessKey).toMatchObject({ ok: false, status: 401 });
    expect(missingBasic).toMatchObject({ ok: false, status: 401 });
  });
});
