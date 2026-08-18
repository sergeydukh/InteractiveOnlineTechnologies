import { test, expect } from '@fixtures';

test.describe('Authentication UI', { tag: '@ui' }, () => {
  test('protected dashboard redirects an anonymous visitor', async ({ page }) => {
    await page.goto('/dashboard.html');
    await expect(page).toHaveURL(/index\.html/u);
  });

  test('invalid login error is visible to the user', { tag: '@known-defect' }, async ({ loginPage, authApiStub }) => {
    test.fail(true, 'KNOWN-001: the current frontend writes the API error only to the browser console.');
    await authApiStub.rejectLogin();
    const response = await loginPage.login('missing-user@example.com', 'wrong-password');
    expect(response.status()).toBe(400);
    await expect(loginPage.error).toBeVisible();
  });
});
