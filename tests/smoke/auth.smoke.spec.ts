import { test, expect } from '@fixtures';

test.describe('Smoke: public auth pages', { tag: '@smoke' }, () => {
  test('login page loads', async ({ loginPage }) => {
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('register page loads', async ({ registerPage }) => {
    await expect(registerPage.nameInput).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.analyticsConsentCheckbox).toBeVisible();
  });
});
