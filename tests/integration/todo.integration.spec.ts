import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';
import { uniqueTagName, uniqueTodoTitle } from '@src/test-support/testData';

test.describe('Todo UI and API integration', { tag: '@integration' }, () => {
  test('persists the todo lifecycle and tag assignment', async ({ api, resourceActor: actor, dashboardPage }) => {
    const tagName = uniqueTagName(actor.identity);
    const title = uniqueTodoTitle(actor.identity);
    const edited = `${title} edited`;

    expect((await dashboardPage.tags.create(tagName)).ok()).toBe(true);
    await dashboardPage.tags.close();
    await dashboardPage.tags.open();
    expect((await dashboardPage.tags.search(tagName)).ok()).toBe(true);
    await expect(dashboardPage.tags.list).toContainText(tagName);
    await dashboardPage.tags.select(tagName);
    expect((await dashboardPage.todos.create(title)).ok()).toBe(true);

    const created = await api.todos.list(actor.session, { search: title });
    expectSuccess(created, 200);
    expect(created.data.todos).toHaveLength(1);
    expect(created.data.todos[0].tags.map((tag) => tag.name)).toContain(tagName);

    expect((await dashboardPage.todos.complete(title)).ok()).toBe(true);
    expect((await dashboardPage.todos.filter('completed')).ok()).toBe(true);
    await expect(dashboardPage.todos.item(title)).toBeVisible();
    expect((await dashboardPage.todos.filter('active')).ok()).toBe(true);
    await expect(dashboardPage.todos.item(title)).toBeHidden();
    expect((await dashboardPage.todos.filter('all')).ok()).toBe(true);
    expect((await dashboardPage.todos.edit(title, edited)).ok()).toBe(true);
    await dashboardPage.page.reload();
    await expect(dashboardPage.todos.item(edited)).toBeVisible();
    expect((await dashboardPage.todos.search(edited)).ok()).toBe(true);
    await expect(dashboardPage.todos.item(edited)).toBeVisible();
    await dashboardPage.todos.openDelete(edited);
    await dashboardPage.todos.cancelDelete();
    await expect(dashboardPage.todos.item(edited)).toBeVisible();
    await dashboardPage.todos.openDelete(edited);
    expect((await dashboardPage.todos.confirmDelete()).ok()).toBe(true);

    const afterDelete = await api.todos.list(actor.session, { search: edited });
    expectSuccess(afterDelete, 200);
    expect(afterDelete.data.todos).toEqual([]);

    expect((await dashboardPage.tags.delete(tagName)).ok()).toBe(true);
    await expect(dashboardPage.tags.list).not.toContainText(`#${tagName}`);
  });

  test('paginates a list larger than the default page size', async ({ api, resourceActor: actor, dashboardPage }) => {
    for (let index = 0; index < 6; index += 1) {
      expectSuccess(await api.todos.create(actor.session, { title: `page-${index}-${Date.now()}` }), 201);
    }
    await dashboardPage.page.reload();
    await expect(dashboardPage.todos.pageInfo).toContainText('Страница 1 из 2');
    expect((await dashboardPage.todos.goToNextPage()).ok()).toBe(true);
    await expect(dashboardPage.todos.pageInfo).toContainText('Страница 2 из 2');
    expect((await dashboardPage.todos.goToPreviousPage()).ok()).toBe(true);
    await expect(dashboardPage.todos.pageInfo).toContainText('Страница 1 из 2');
  });
});
