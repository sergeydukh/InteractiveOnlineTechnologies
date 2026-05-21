import { test, expect } from '../../fixtures';
import { uniqueTodoTitle } from '../../utils/testData';

test.describe('API: todos', { tag: '@api' }, () => {
  test('creates, updates, lists and deletes a todo', async ({ api, testUser }) => {
    const title = uniqueTodoTitle();
    const created = await api.createTodo(testUser.token, { title });
    expect(created.todo.title).toBe(title);
    expect(created.todo.completed).toBe(false);

    const updated = await api.updateTodo(testUser.token, created.todo._id, {
      title: `${title} edited`,
      completed: true,
    });
    expect(updated.todo.completed).toBe(true);

    const list = await api.listTodos(testUser.token, { search: 'edited' });
    expect(list.todos.map(todo => todo._id)).toContain(created.todo._id);

    await api.deleteTodo(testUser.token, created.todo._id);
    const afterDelete = await api.listTodos(testUser.token, { search: updated.todo.title });
    expect(afterDelete.todos.map(todo => todo._id)).not.toContain(created.todo._id);
  });
});

