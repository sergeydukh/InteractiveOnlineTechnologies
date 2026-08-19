import { test, expect } from '@fixtures';
import { DashboardPage } from '@src/ui/pages/dashboardPage';

test.describe('Authentication UI', { tag: '@ui' }, () => {
  test('protected dashboard redirects an anonymous visitor', async ({ page }) => {
    await page.goto('/dashboard.html');
    await expect(page).toHaveURL(/index\.html/u);
  });

  test('protected profile redirects an anonymous visitor', async ({ page }) => {
    await page.goto('/profile.html');
    await expect(page).toHaveURL(/index\.html/u);
  });

  test('logs in and logs out through the browser', async ({ resourceActor: actor, loginPage, page }) => {
    expect((await loginPage.login(actor.user.email, actor.user.password)).ok()).toBe(true);
    await expect(page).toHaveURL(/dashboard\.html/u);

    const dashboard = new DashboardPage(page);
    await expect(dashboard.todos.input).toBeVisible();
    await dashboard.logout();
    await expect(page).toHaveURL(/index\.html/u);
    await page.goto('/dashboard.html');
    await expect(page).toHaveURL(/index\.html/u);
  });

  test('invalid login error is visible to the user', { tag: '@known-defect' }, async ({ loginPage, authRouteStub }) => {
    await authRouteStub.rejectLogin();
    const response = await loginPage.login('missing-user@example.com', 'wrong-password');
    expect(response.status()).toBe(400);
    test.fail(true, 'KNOWN-001: the current frontend writes the API error only to the browser console.');
    await expect(loginPage.error).toBeVisible();
  });
});
