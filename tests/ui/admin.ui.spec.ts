import { test, expect } from '@fixtures';
import { AdminPage } from '@src/ui/pages/adminPage';

test.describe('Admin UI', { tag: '@ui' }, () => {
  test('logs in with the issued admin credentials and logs out', async ({ page, adminCredentials }) => {
    const admin = new AdminPage(page);
    await admin.open();
    expect((await admin.login(adminCredentials.email, adminCredentials.password)).ok()).toBe(true);
    await expect(admin.panel).toBeVisible();
    expect((await admin.logout()).ok()).toBe(true);
    await expect(admin.panel).toBeHidden();
  });

  test('invalid admin password does not open the panel', async ({ page, authRouteStub }) => {
    const admin = new AdminPage(page);
    await admin.open();
    await authRouteStub.rejectLogin();
    const response = await admin.login('invalid-admin@example.com', 'invalid-password');
    expect(response.status()).toBe(400);
    await expect(admin.panel).toBeHidden();
    await expect(page).toHaveURL(/admin\.html/u);
  });
});
