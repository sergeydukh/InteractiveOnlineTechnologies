import { test, expect } from '@fixtures';

test.describe('Smoke: profile', { tag: '@smoke' }, () => {
  test('shared user opens profile with readonly email', async ({ sharedProfilePage }) => {
    await expect(sharedProfilePage.nameInput).toBeVisible();
    await expect(sharedProfilePage.emailInput).toBeVisible();
    await expect(sharedProfilePage.emailInput).toHaveAttribute('readonly');
  });
});
