import { test, expect } from '@fixtures';
import { DashboardPage } from '@pages/DashboardPage';
import { createTempAvatar, removeFileIfExists, uniqueEmail, uniqueTodoTitle } from '@utils/testData';

test.describe('Integration: analytics events', { tag: ['@integration'] }, () => {
  test('records register, login and logout events for UI auth flow', async ({ api, registerPage, page }) => {
    const user = {
      name: `Analytics UI ${Date.now()}`,
      email: uniqueEmail('analytics-ui'),
      gender: 'female',
      password: 'TestPass!123',
      analyticsConsent: true,
    } as const;

    await registerPage.register(user);
    await expect(page).toHaveURL(/dashboard\.html/);

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

    await new DashboardPage(page).logout();
    await expect(page).toHaveURL(/index\.html/);

    await api.waitForAnalyticsEvent(
      event => event.type === 'logout' && event.status === 'success' && event.email === user.email,
      { message: 'Expected logout analytics event for UI-created user' },
    );
  });

  test('records todo and profile mutation events for a unique user', async ({
    api,
    testUser,
    uniqueDashboardPage,
    uniqueProfilePage,
  }) => {
    const title = uniqueTodoTitle();
    const editedTitle = `${title} edited`;

    await test.step('perform todo lifecycle through UI', async () => {
      await uniqueDashboardPage.addTodo(title);
      await uniqueDashboardPage.completeTodo(title);
      await uniqueDashboardPage.editTodo(title, editedTitle);
      await uniqueDashboardPage.deleteTodo(editedTitle);
    });

    await test.step('verify todo analytics events', async () => {
      for (const type of ['todoCreate', 'todoComplete', 'todoEdit', 'todoDelete'] as const) {
        await api.waitForAnalyticsEvent(
          event => event.type === type && event.status === 'success' && event.email === testUser.email,
          { message: `Expected ${type} analytics event for ${testUser.email}` },
        );
      }
    });

    await test.step('perform profile mutations while consent is enabled', async () => {
      await uniqueProfilePage.changePassword('Password1!', 'Password2!', false);
      await expect(uniqueProfilePage.passwordFormMessage).toHaveText(/Пароли не совпадают/);

      const failedPasswordResponse = await api.rawChangePassword(testUser.token, 'Password1!', 'Password2!');
      expect(failedPasswordResponse.status()).toBeGreaterThanOrEqual(400);
      expect(failedPasswordResponse.status()).toBeLessThan(500);

      await uniqueProfilePage.changePassword('NewPass!456', 'NewPass!456');
      await expect(uniqueProfilePage.passwordModal).not.toBeVisible();

      const tmpFile = createTempAvatar();
      try {
        await uniqueProfilePage.uploadPhoto(tmpFile);
      } finally {
        removeFileIfExists(tmpFile);
      }

      await uniqueProfilePage.setAnalyticsConsent(false);
      await expect(uniqueProfilePage.page).toHaveURL(/dashboard\.html/);
    });

    await test.step('verify profile analytics events', async () => {
      await api.waitForAnalyticsEvent(
        event =>
          event.type === 'passwordChangeFailed' &&
          event.status === 'failed' &&
          event.email === testUser.email &&
          typeof event.reason === 'string',
        { message: `Expected passwordChangeFailed analytics event for ${testUser.email}` },
      );

      await api.waitForAnalyticsEvent(
        event => event.type === 'passwordChangeSuccess' && event.status === 'success' && event.email === testUser.email,
        { message: `Expected passwordChangeSuccess analytics event for ${testUser.email}` },
      );

      await api.waitForAnalyticsEvent(
        event =>
          event.type === 'photoUpload' &&
          event.status === 'success' &&
          event.email === testUser.email &&
          typeof event.fileName === 'string' &&
          event.fileName.endsWith('.png'),
        { message: `Expected photoUpload analytics event for ${testUser.email}` },
      );

      await api.waitForAnalyticsEvent(
        event =>
          event.type === 'analyticsConsentChange' &&
          event.status === 'success' &&
          event.email === testUser.email &&
          event.analyticsConsent === false,
        { message: `Expected analyticsConsentChange analytics event for ${testUser.email}` },
      );
    });
  });
});
