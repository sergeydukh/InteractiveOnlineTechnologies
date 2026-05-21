import { test, expect } from '@fixtures';

test.describe('Integration: profile UI + API', { tag: ['@integration'] }, () => {
  test.describe.configure({ timeout: 180000 });

  test('UI profile update is persisted in API state', async ({ api, testUser, uniqueProfilePage }) => {
    const newName = `Integrated ${Date.now()}`;

    await uniqueProfilePage.updateName(newName);
    await expect(uniqueProfilePage.page).toHaveURL(/dashboard\.html/);

    const profile = await api.getProfile(testUser.token);
    expect(profile.user.name).toBe(newName);
  });
});
