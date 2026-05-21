import { test, expect } from '../../fixtures';

test.describe('Integration: profile UI + API', () => {
  test('UI profile update is persisted in API state', async ({ api, testUser, uniqueProfilePage }) => {
    const newName = `Integrated ${Date.now()}`;

    await uniqueProfilePage.updateName(newName);
    await expect(uniqueProfilePage.page).toHaveURL(/dashboard\.html/, { timeout: 5000 });

    const profile = await api.getProfile(testUser.token);
    expect(profile.user.name).toBe(newName);
  });
});

