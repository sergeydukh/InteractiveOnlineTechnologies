import { test, expect } from '../../fixtures';
import { createTestUser } from '../../utils/testData';

test.describe('Integration: admin UI + API data', { tag: ['@integration'] }, () => {
  test('admin search finds a user created through API', async ({ api, adminPage }) => {
    const user = createTestUser();
    await api.register(user);

    await adminPage.searchUser(user.email);
    await expect(adminPage.usersContainer).toContainText(user.email);
  });
});

