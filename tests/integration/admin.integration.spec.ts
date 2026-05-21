import { test, expect } from '@fixtures';

test.describe('Integration: admin UI + API data', { tag: ['@integration'] }, () => {
  test('admin search finds a user created through API', async ({ adminPage, testUser }) => {
    await adminPage.searchUser(testUser.email);
    await expect(adminPage.usersContainer).toContainText(testUser.email);
  });
});
