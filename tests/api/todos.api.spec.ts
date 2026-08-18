import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';
import { uniqueTodoTitle } from '@src/test-support/testData';

test.describe('Todos API', { tag: '@api' }, () => {
  test('covers lifecycle, boundaries and ownership', async ({ api, actor, secondaryActor }) => {
    const title = uniqueTodoTitle(actor.identity);
    const created = await api.todos.create(actor.session, { title });
    expectSuccess(created, 201);
    expect(created.data.todo).toMatchObject({ title, completed: false });

    const updated = await api.todos.update(actor.session, created.data.todo._id, {
      title: `${title} edited`,
      completed: true,
    });
    expectSuccess(updated);

    const filtered = await api.todos.list(actor.session, { status: 'completed', search: 'edited' });
    expectSuccess(filtered);
    expect(filtered.data.todos.map((todo) => todo._id)).toContain(created.data.todo._id);

    const accepted = await api.todos.create(actor.session, { title: 'a'.repeat(200) });
    expectSuccess(accepted, 201);

    for (const title of ['', '   ', 'a'.repeat(201)]) {
      const rejected = await api.todos.create(actor.session, { title });
      expect(rejected.ok, JSON.stringify({ length: title.length })).toBe(false);
      expect(rejected.status).toBeGreaterThanOrEqual(400);
      expect(rejected.status).toBeLessThan(500);
    }
    const foreignUpdate = await api.todos.update(secondaryActor.session, created.data.todo._id, { completed: true });
    expect(foreignUpdate.ok).toBe(false);
    expect([403, 404]).toContain(foreignUpdate.status);

    const deleted = await api.todos.delete(actor.session, created.data.todo._id);
    expectSuccess(deleted);
  });
});
