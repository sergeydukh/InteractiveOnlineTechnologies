import { test, expect } from '../../fixtures';

test.describe('Smoke: dashboard', { tag: '@smoke' }, () => {
  test('shared user opens dashboard', async ({ sharedDashboardPage }) => {
    await expect(sharedDashboardPage.todoInput).toBeVisible();
    await expect(sharedDashboardPage.filterAll).toBeVisible();
    await expect(sharedDashboardPage.filterActive).toBeVisible();
    await expect(sharedDashboardPage.filterCompleted).toBeVisible();
  });
});

