import { test, expect } from '../../fixtures';
import { getSecrets } from '../../utils/secrets';
import { AdminPage } from '../../pages/AdminPage';

test.describe('UI: admin login validation', () => {
  test('wrong admin password keeps user on login form', async ({ page }) => {
    const secrets = getSecrets();
    const admin = new AdminPage(page);

    await admin.goto();
    await admin.login(secrets.adminEmail, 'wrong-admin-password');

    await expect(page).not.toHaveURL(/dashboard\.html/);
    await expect(admin.adminPanel).not.toBeVisible({ timeout: 2000 });
  });
});
