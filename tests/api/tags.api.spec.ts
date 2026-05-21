import { test, expect } from '../../fixtures';
import { uniqueTagName } from '../../utils/testData';

test.describe('API: tags', { tag: '@api' }, () => {
  test('creates, lists and deletes a tag', async ({ api, testUser }) => {
    const palette = await api.getTagPalette(testUser.token);
    expect(palette.colors.length).toBeGreaterThan(0);

    const name = uniqueTagName();
    const created = await api.createTag(testUser.token, {
      name,
      color: palette.colors[0],
    });
    expect(created.tag.name).toBe(name);

    const list = await api.listTags(testUser.token, name);
    expect(list.tags.map(tag => tag._id)).toContain(created.tag._id);

    await api.deleteTag(testUser.token, created.tag._id);
  });
});

