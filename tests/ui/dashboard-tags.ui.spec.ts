import { test, expect } from '../../fixtures';
import { uniqueTagName, uniqueTodoTitle } from '../../utils/testData';

test.describe('UI: dashboard tags', { tag: ['@ui'] }, () => {
  test('creates a tag and assigns it to a new todo', async ({ uniqueDashboardPage }) => {
    const tagName = uniqueTagName();
    const title = uniqueTodoTitle();

    await uniqueDashboardPage.createTag(tagName);
    await uniqueDashboardPage.selectTag(tagName);
    await uniqueDashboardPage.addTodo(title);

    const todo = uniqueDashboardPage.getTodoItem(title);
    await expect(todo).toBeVisible();
    await expect(todo.getByText(`#${tagName}`, { exact: false })).toBeVisible();
  });
});

