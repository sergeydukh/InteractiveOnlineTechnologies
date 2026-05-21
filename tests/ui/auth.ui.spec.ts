import { test, expect } from '../../fixtures';

test.describe('UI: login validation', { tag: ['@ui'] }, () => {
  test('wrong password keeps user on login page', async ({ loginPage, page }) => {
    const responsePromise = page.waitForResponse(r => r.url().includes('/api/auth/login'));
    await loginPage.login('nonexistent-user@example.com', 'wrong-password-!@#');
    const response = await responsePromise;
    const body = (await response.json()) as { message: string };

    expect(response.status()).toBeLessThan(500);
    expect(response.status()).toBe(400);
    expect(body.message).toBe('Invalid credentials');
    await expect(page).toHaveURL(/index\.html/);
  });
});
