import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';
import { uniqueTagName } from '@src/test-support/testData';

test.describe('Tags API', { tag: '@api' }, () => {
  test('covers tag assignment, ensure, duplicate and length contracts', async ({
    api,
    resourceActor: actor,
    secondaryResourceActor,
  }) => {
    const palette = await api.tags.palette(actor.session);
    expectSuccess(palette, 200);
    const tag = await api.tags.create(actor.session, {
      name: uniqueTagName(actor.identity),
      color: palette.data.colors[0],
    });
    expectSuccess(tag, 201);

    const ensured = await api.tags.ensure(actor.session, `inline-${uniqueTagName(actor.identity)}`);
    expectSuccess(ensured, 201);

    const todo = await api.todos.create(actor.session, {
      title: `tag-filter-${Date.now()}`,
      tagIds: [tag.data.tag._id],
    });
    expectSuccess(todo, 201);
    const filtered = await api.todos.list(actor.session, { tagIds: [tag.data.tag._id] });
    expectSuccess(filtered, 200);
    expect(filtered.data.todos.map((item) => item._id)).toContain(todo.data.todo._id);
    const detached = await api.todos.update(actor.session, todo.data.todo._id, { tagIds: [] });
    expectSuccess(detached, 200);
    expect(detached.data.todo.tags).toEqual([]);

    const boundary = await api.tags.create(actor.session, { name: 'n'.repeat(40), color: palette.data.colors[0] });
    expectSuccess(boundary, 201);
    const duplicate = await api.tags.create(actor.session, {
      name: boundary.data.tag.name,
      color: palette.data.colors[0],
    });
    const tooLong = await api.tags.create(actor.session, { name: 'n'.repeat(41), color: palette.data.colors[0] });
    expect(duplicate).toMatchObject({ ok: false, status: 409, error: { message: expect.any(String) } });
    expect(tooLong).toMatchObject({ ok: false, status: 400, error: { message: expect.any(String) } });

    const foreignList = await api.tags.list(secondaryResourceActor.session, tag.data.tag.name);
    expectSuccess(foreignList, 200);
    expect(foreignList.data.tags).toEqual([]);
    const foreignDelete = await api.tags.delete(secondaryResourceActor.session, tag.data.tag._id);
    expect(foreignDelete).toMatchObject({ ok: false, status: 404, error: { message: expect.any(String) } });
    const ownerList = await api.tags.list(actor.session, tag.data.tag.name);
    expectSuccess(ownerList, 200);
    expect(ownerList.data.tags.map((item) => item._id)).toContain(tag.data.tag._id);

    expectSuccess(await api.tags.delete(actor.session, ensured.data.tag._id), 200);
  });
});
