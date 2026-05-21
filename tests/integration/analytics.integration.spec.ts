import { test, expect } from '@fixtures';
import { DashboardPage } from '@pages/DashboardPage';
import { ProfilePage } from '@pages/ProfilePage';
import { createTempAvatar, removeFileIfExists, uniqueEmail, uniqueTodoTitle } from '@utils/testData';

test.describe('Integration: analytics events', { tag: ['@integration'] }, () => {
  test.describe.configure({ timeout: 60000 });

  test('records auth, todo and profile mutation events for a unique user', async ({ api, registerPage, page }) => {
    const user = {
      name: `Analytics Mutations ${Date.now()}`,
      email: uniqueEmail('analytics-mutations'),
      gender: 'female',
      password: 'TestPass!123',
      analyticsConsent: true,
    } as const;
    const title = uniqueTodoTitle();
    const editedTitle = `${title} edited`;
    let token = '';

    await test.step('register unique analytics user through UI', async () => {
      await registerPage.register(user);
      await expect(page).toHaveURL(/dashboard\.html/);
      await page.locator('[data-ui="todo-input"], [data-ui="add-todo-button"]').first().waitFor({ state: 'visible' });

      token = await page.evaluate(() => window.localStorage.getItem('token') ?? '');
      expect(token).toBeTruthy();
    });

    await test.step('verify auth analytics events', async () => {
      await api.waitForAnalyticsEvent(
        event =>
          event.type === 'register' &&
          event.status === 'success' &&
          event.email === user.email &&
          event.name === user.name &&
          (event.gender === 1 || event.gender === '1'),
        { message: 'Expected register analytics event for UI-created user' },
      );

      await api.waitForAnalyticsEvent(
        event => event.type === 'login' && event.status === 'success' && event.email === user.email,
        { message: 'Expected login analytics event for UI-created user' },
      );
    });

    await test.step('logout registered analytics user', async () => {
      await new DashboardPage(page).logout();
      await expect(page).toHaveURL(/index\.html/);

      await api.waitForAnalyticsEvent(
        event => event.type === 'logout' && event.status === 'success' && event.email === user.email,
        { message: 'Expected logout analytics event for UI-created user' },
      );
    });

    await test.step('restore registered session for mutation checks', async () => {
      await page.evaluate(authToken => window.localStorage.setItem('token', authToken), token);
      await page.goto('/dashboard.html');
      await page.locator('[data-ui="todo-input"], [data-ui="add-todo-button"]').first().waitFor({ state: 'visible' });
    });

    await test.step('perform todo lifecycle', async () => {
      const created = await api.createTodo(token, { title });
      await api.updateTodo(token, created.todo._id, { completed: true });
      await api.updateTodo(token, created.todo._id, { title: editedTitle });
      await api.deleteTodo(token, created.todo._id);
    });

    await test.step('verify todo analytics events', async () => {
      for (const type of ['todoCreate', 'todoComplete', 'todoEdit', 'todoDelete'] as const) {
        await api.waitForAnalyticsEvent(
          event => event.type === type && event.status === 'success' && event.email === user.email,
          { message: `Expected ${type} analytics event for ${user.email}` },
        );
      }
    });

    await test.step('perform profile mutations', async () => {
      const profilePage = new ProfilePage(page);
      await profilePage.goto();
      await expect(profilePage.nameInput).toBeVisible();

      await profilePage.changePassword('Password1!', 'Password2!', false);
      await expect(profilePage.passwordFormMessage).toHaveText(/Пароли не совпадают/);

      const failedPasswordResponse = await api.rawChangePassword(token, 'Password1!', 'Password2!');
      expect(failedPasswordResponse.status()).toBeGreaterThanOrEqual(400);
      expect(failedPasswordResponse.status()).toBeLessThan(500);

      await profilePage.changePassword('NewPass!456', 'NewPass!456');
      await expect(profilePage.passwordModal).not.toBeVisible();

      const tmpFile = createTempAvatar();
      try {
        await profilePage.uploadPhoto(tmpFile);
      } finally {
        removeFileIfExists(tmpFile);
      }

      await profilePage.setAnalyticsConsent(false);
      await expect(page).toHaveURL(/dashboard\.html/);
    });

    await test.step('verify profile analytics events', async () => {
      await api.waitForAnalyticsEvent(
        event =>
          event.type === 'passwordChangeFailed' &&
          event.status === 'failed' &&
          event.email === user.email &&
          typeof event.reason === 'string',
        { message: `Expected passwordChangeFailed analytics event for ${user.email}` },
      );

      await api.waitForAnalyticsEvent(
        event => event.type === 'passwordChangeSuccess' && event.status === 'success' && event.email === user.email,
        { message: `Expected passwordChangeSuccess analytics event for ${user.email}` },
      );

      await api.waitForAnalyticsEvent(
        event =>
          event.type === 'photoUpload' &&
          event.status === 'success' &&
          event.email === user.email &&
          typeof event.fileName === 'string' &&
          event.fileName.endsWith('.png'),
        { message: `Expected photoUpload analytics event for ${user.email}` },
      );

      await api.waitForAnalyticsEvent(
        event =>
          event.type === 'analyticsConsentChange' &&
          event.status === 'success' &&
          event.email === user.email &&
          event.analyticsConsent === false,
        { message: `Expected analyticsConsentChange analytics event for ${user.email}` },
      );
    });
  });
});
