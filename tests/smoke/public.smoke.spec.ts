import { test, expect } from '@fixtures';

test.describe('Public pages smoke', { tag: '@smoke' }, () => {
  test('login page renders its critical controls', async ({ loginPage }) => {
    await expect(loginPage.email).toBeVisible();
    await expect(loginPage.password).toBeVisible();
    await expect(loginPage.submit).toBeVisible();
  });

  test('registration page renders consent control', async ({ registerPage }) => {
    await expect(registerPage.name).toBeVisible();
    await expect(registerPage.email).toBeVisible();
    await expect(registerPage.analyticsConsent).toBeVisible();
  });

  test('vacancy application form is available without creating credentials', async ({ page }) => {
    await page.goto('/vacancy-application.html');
    await expect(page.getByRole('heading', { name: 'Заявка на вакансию' })).toBeVisible();
    await expect(page.locator('[data-ui="vacancy-full-name"]')).toBeVisible();
  });
});
