import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';
import { uniqueTodoTitle } from '@src/test-support/testData';

test.describe('Todos API', { tag: '@api' }, () => {
  test('covers lifecycle, boundaries and ownership', async ({ api, resourceActor: actor, secondaryResourceActor }) => {
    const title = uniqueTodoTitle(actor.identity);
    const created = await api.todos.create(actor.session, { title });
    expectSuccess(created, 201);
    expect(created.data.todo).toMatchObject({ title, completed: false });

    const updated = await api.todos.update(actor.session, created.data.todo._id, {
      title: `${title} edited`,
      completed: true,
    });
    expectSuccess(updated, 200);

    const filtered = await api.todos.list(actor.session, { status: 'completed', search: 'edited' });
    expectSuccess(filtered, 200);
    expect(filtered.data.todos.map((todo) => todo._id)).toContain(created.data.todo._id);

    const accepted = await api.todos.create(actor.session, { title: 'a'.repeat(200) });
    expectSuccess(accepted, 201);
    expectSuccess(await api.todos.delete(actor.session, accepted.data.todo._id), 200);

    for (const title of ['', '   ']) {
      const rejected = await api.todos.create(actor.session, { title });
      expect(rejected, JSON.stringify({ length: title.length })).toMatchObject({
        ok: false,
        status: 400,
        error: { message: 'Title is required' },
      });
    }
    const tooLong = await api.todos.create(actor.session, { title: 'a'.repeat(201) });
    expect(tooLong).toMatchObject({
      ok: false,
      status: 400,
      error: { message: 'Title is too long (max 200 chars)' },
    });
    const foreignRead = await api.todos.list(secondaryResourceActor.session, { search: created.data.todo._id });
    expectSuccess(foreignRead, 200);
    expect(foreignRead.data.todos).toEqual([]);
    const foreignUpdate = await api.todos.update(secondaryResourceActor.session, created.data.todo._id, {
      completed: true,
    });
    expect(foreignUpdate).toMatchObject({ ok: false, status: 404, error: { message: expect.any(String) } });
    const foreignDelete = await api.todos.delete(secondaryResourceActor.session, created.data.todo._id);
    expect(foreignDelete).toMatchObject({ ok: false, status: 404, error: { message: expect.any(String) } });

    const deleted = await api.todos.delete(actor.session, created.data.todo._id);
    expectSuccess(deleted, 200);
  });
});
