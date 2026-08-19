import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';

test.describe('Admin UI and API-created data', { tag: '@integration' }, () => {
  test('shows a newly registered user, todo and event without exposing admin credentials', async ({
    adminPage,
    resourceActor: actor,
    api,
  }) => {
    const title = `admin-visible-${Date.now()}`;
    expectSuccess(await api.todos.create(actor.session, { title }), 201);
    const response = await adminPage.searchFor(actor.user.email);
    expect(response.ok()).toBe(true);
    await expect(adminPage.users).toContainText(actor.user.email);
    await expect(adminPage.users).toContainText(title);
    await adminPage.openFirstEventJson();
    await expect(adminPage.eventJson).toContainText('"type"');
    await adminPage.closeEventJson();
  });

  test('moves between overview pages without changing admin data', async ({ adminPage }) => {
    await expect(adminPage.pagination).toBeVisible();
    expect((await adminPage.goToNextPage()).ok()).toBe(true);
    await expect(adminPage.pagination).toContainText('Страница 2');
  });
});
