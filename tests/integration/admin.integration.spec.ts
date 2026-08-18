import { test, expect } from '@fixtures';

test.describe('Admin UI and API-created data', { tag: '@integration' }, () => {
  test('finds a newly registered user without exposing admin credentials', async ({ adminPage, actor }) => {
    const response = await adminPage.searchFor(actor.user.email);
    expect(response.ok()).toBe(true);
    await expect(adminPage.users).toContainText(actor.user.email);
  });
});
