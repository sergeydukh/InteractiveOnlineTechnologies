import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';
import { uniqueTagName, uniqueTodoTitle } from '@src/test-support/testData';

test.describe('Todo UI and API integration', { tag: '@integration' }, () => {
  test('persists the todo lifecycle and tag assignment', async ({ api, actor, dashboardPage }) => {
    const tagName = uniqueTagName(actor.identity);
    const title = uniqueTodoTitle(actor.identity);
    const edited = `${title} edited`;

    expect((await dashboardPage.tags.create(tagName)).ok()).toBe(true);
    await dashboardPage.tags.select(tagName);
    expect((await dashboardPage.todos.create(title)).ok()).toBe(true);

    const created = await api.todos.list(actor.session, { search: title });
    expectSuccess(created);
    expect(created.data.todos).toHaveLength(1);
    expect(created.data.todos[0].tags.map((tag) => tag.name)).toContain(tagName);

    expect((await dashboardPage.todos.complete(title)).ok()).toBe(true);
    expect((await dashboardPage.todos.edit(title, edited)).ok()).toBe(true);
    await dashboardPage.todos.openDelete(edited);
    await dashboardPage.todos.cancelDelete();
    await expect(dashboardPage.todos.item(edited)).toBeVisible();
    await dashboardPage.todos.openDelete(edited);
    expect((await dashboardPage.todos.confirmDelete()).ok()).toBe(true);

    const afterDelete = await api.todos.list(actor.session, { search: edited });
    expectSuccess(afterDelete);
    expect(afterDelete.data.todos).toEqual([]);
  });
});
