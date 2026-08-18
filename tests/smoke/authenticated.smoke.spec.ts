import { test, expect } from '@fixtures';

test.describe('Authenticated pages smoke', { tag: '@smoke' }, () => {
  test('read-only user opens dashboard', async ({ readOnlyDashboardPage }) => {
    await expect(readOnlyDashboardPage.todos.input).toBeVisible();
    await expect(readOnlyDashboardPage.todos.filterAll).toBeVisible();
  });

  test('read-only user opens profile with immutable email', async ({ readOnlyProfilePage }) => {
    await expect(readOnlyProfilePage.name).toBeVisible();
    await expect(readOnlyProfilePage.email).toHaveAttribute('readonly');
  });

  test('admin session opens the panel', async ({ adminPage }) => {
    await expect(adminPage.panel).toBeVisible();
    await expect(adminPage.users).toBeVisible();
  });
});
