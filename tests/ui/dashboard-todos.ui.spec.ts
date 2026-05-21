import { test, expect } from '../../fixtures';
import { uniqueTodoTitle } from '../../utils/testData';

test.describe('UI: dashboard todos', () => {
  test('creates, completes, edits and deletes a todo through UI', async ({ uniqueDashboardPage }) => {
    const title = uniqueTodoTitle();
    const editedTitle = `${title} edited`;

    await uniqueDashboardPage.addTodo(title);
    await uniqueDashboardPage.waitForTodoVisible(title);
    await expect(uniqueDashboardPage.getTodoItem(title)).toBeVisible();

    await uniqueDashboardPage.completeTodo(title);
    await expect(uniqueDashboardPage.getTodoItem(title).getByRole('checkbox')).toBeChecked();

    await uniqueDashboardPage.editTodo(title, editedTitle);
    await uniqueDashboardPage.waitForTodoVisible(editedTitle);
    await expect(uniqueDashboardPage.getTodoItem(title)).not.toBeVisible({ timeout: 3000 });

    await uniqueDashboardPage.deleteTodo(editedTitle);
    await expect(uniqueDashboardPage.getTodoItem(editedTitle)).not.toBeVisible({ timeout: 5000 });
  });
});

