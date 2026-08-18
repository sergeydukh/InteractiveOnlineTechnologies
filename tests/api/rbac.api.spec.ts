import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';

test.describe('Admin API and RBAC', { tag: '@api' }, () => {
  test('enforces admin and user roles on the same resource', async ({ api, adminSession, actor }) => {
    expect(adminSession.role).toBe('admin');
    const result = await api.admin.getOverview(adminSession, { search: actor.user.email });
    expectSuccess(result);
    expect(result.data.users.map((user) => user.email)).toContain(actor.user.email);
    const forbidden = await api.admin.getOverview(actor.session);
    expect(forbidden).toMatchObject({ ok: false, status: 403 });
  });

  test('unknown admin search returns an empty page contract', async ({ api, adminSession }) => {
    const result = await api.admin.getOverview(adminSession, { search: `missing-${Date.now()}@example.com` });
    expectSuccess(result);
    expect(result.data.users).toEqual([]);
    expect(result.data.pagination.total).toBe(0);
  });
});
