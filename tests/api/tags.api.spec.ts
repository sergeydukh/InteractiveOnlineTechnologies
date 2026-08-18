import { test, expect } from '@fixtures';
import { expectSuccess } from '@src/test-support/apiAssertions';
import { uniqueTagName } from '@src/test-support/testData';

test.describe('Tags API', { tag: '@api' }, () => {
  test('covers tag assignment, duplicate and length contracts', async ({ api, actor }) => {
    const palette = await api.tags.palette(actor.session);
    expectSuccess(palette);
    const tag = await api.tags.create(actor.session, {
      name: uniqueTagName(actor.identity),
      color: palette.data.colors[0],
    });
    expectSuccess(tag, 201);

    const todo = await api.todos.create(actor.session, {
      title: `tag-filter-${Date.now()}`,
      tagIds: [tag.data.tag._id],
    });
    expectSuccess(todo, 201);
    const filtered = await api.todos.list(actor.session, { tagIds: [tag.data.tag._id] });
    expectSuccess(filtered);
    expect(filtered.data.todos.map((item) => item._id)).toContain(todo.data.todo._id);

    const boundary = await api.tags.create(actor.session, { name: 'n'.repeat(40), color: palette.data.colors[0] });
    expectSuccess(boundary, 201);
    const duplicate = await api.tags.create(actor.session, {
      name: boundary.data.tag.name,
      color: palette.data.colors[0],
    });
    const tooLong = await api.tags.create(actor.session, { name: 'n'.repeat(41), color: palette.data.colors[0] });
    expect(duplicate.ok).toBe(false);
    expect(tooLong.ok).toBe(false);
  });
});
