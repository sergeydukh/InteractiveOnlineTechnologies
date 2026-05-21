import { test, expect } from '../../fixtures';

test.describe('API: admin', { tag: '@api' }, () => {
  test('admin overview supports search by email', async ({ api, testUser }) => {
    const admin = await api.adminLogin();
    const overview = await api.adminOverview(admin.token, { search: testUser.email });

    expect(overview.users.map(user => user.email)).toContain(testUser.email);
  });
});

