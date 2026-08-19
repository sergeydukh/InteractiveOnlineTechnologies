import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';

test.describe('Admin API and RBAC', { tag: '@api' }, () => {
  test('enforces admin and user roles on the same resource', async ({ api, adminSession, resourceActor: actor }) => {
    expect(adminSession.role).toBe('admin');
    const result = await api.admin.getOverview(adminSession, { search: actor.user.email });
    expectSuccess(result, 200);
    expect(result.data.users.map((user) => user.email)).toContain(actor.user.email);
    const forbidden = await api.admin.getOverview(actor.session);
    expect(forbidden).toMatchObject({ ok: false, status: 403, error: { message: expect.any(String) } });
  });

  test('unknown admin search returns an empty page contract', async ({ api, adminSession }) => {
    const result = await api.admin.getOverview(adminSession, { search: `missing-${Date.now()}@example.com` });
    expectSuccess(result, 200);
    expect(result.data.users).toEqual([]);
    expect(result.data.pagination.total).toBe(0);
  });

  test('paginates the admin overview', async ({ api, adminSession }) => {
    const first = await api.admin.getOverview(adminSession, { page: 1, limit: 1 });
    expectSuccess(first, 200);
    expect(first.data.users).toHaveLength(1);
    expect(first.data.pagination).toMatchObject({ page: 1, limit: 1 });
    expect(first.data.pagination.totalPages).toBeGreaterThan(1);
    const second = await api.admin.getOverview(adminSession, { page: 2, limit: 1 });
    expectSuccess(second, 200);
    expect(second.data.pagination.page).toBe(2);
    expect(second.data.users[0]?.email).not.toBe(first.data.users[0]?.email);
  });
});
