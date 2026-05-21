import { test, expect } from '../../fixtures';
import { uniqueTodoTitle } from '../../utils/testData';

test.describe('Integration: todos UI + API', () => {
  test('UI todo lifecycle is reflected in API state', async ({ api, testUser, uniqueDashboardPage }) => {
    const title = uniqueTodoTitle();
    const editedTitle = `${title} edited`;

    await uniqueDashboardPage.addTodo(title);
    let list = await api.listTodos(testUser.token, { search: title });
    const created = list.todos.find(todo => todo.title === title);
    expect(created).toBeTruthy();

    await uniqueDashboardPage.editTodo(title, editedTitle);
    list = await api.listTodos(testUser.token, { search: editedTitle });
    const edited = list.todos.find(todo => todo.title === editedTitle);
    expect(edited).toBeTruthy();

    await uniqueDashboardPage.deleteTodo(editedTitle);
    await expect
      .poll(async () => {
        const todos = await api.listTodos(testUser.token, { search: editedTitle });
        return todos.todos.some(todo => todo.title === editedTitle);
      })
      .toBe(false);
  });
});
