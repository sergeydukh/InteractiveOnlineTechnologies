import { test, expect } from '@fixtures';
import { AdminPage } from '@src/ui/pages/adminPage';

test.describe('Admin UI', { tag: '@ui' }, () => {
  test('invalid admin password does not open the panel', async ({ page, authApiStub }) => {
    const admin = new AdminPage(page);
    await admin.open();
    await authApiStub.rejectLogin();
    const response = await admin.login('invalid-admin@example.com', 'invalid-password');
    expect(response.status()).toBe(400);
    await expect(admin.panel).toBeHidden();
    await expect(page).toHaveURL(/admin\.html/u);
  });
});
