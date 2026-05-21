import { test, expect } from '../../fixtures';

test.describe('Smoke: admin', () => {
  test('admin opens admin panel', async ({ adminPage }) => {
    await expect(adminPage.adminPanel).toBeVisible();
    await expect(adminPage.usersContainer).toBeVisible();
    await expect(adminPage.userSearchInput).toBeVisible();
  });
});

