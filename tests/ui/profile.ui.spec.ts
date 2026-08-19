import { test, expect } from '@fixtures';
import { createTempAvatar, removeTempFile } from '@src/test-support/testData';

test.describe('Profile UI', { tag: '@ui' }, () => {
  test('validates password and avatar interactions', async ({ profilePage }) => {
    const response = await profilePage.passwordDialog.submit('Password1!', 'Password2!', false);
    expect(response).toBeUndefined();
    await expect(profilePage.passwordDialog.message).toHaveText(/Пароли не совпадают/u);
    await profilePage.passwordDialog.cancel();

    const file = createTempAvatar();
    try {
      const upload = await profilePage.upload(file);
      expect(upload.ok()).toBe(true);
      await expect(profilePage.avatar).not.toHaveAttribute('src', /placeholder/u);
      const removal = await profilePage.removeAvatar();
      expect(removal.ok()).toBe(true);
    } finally {
      removeTempFile(file);
    }

    await profilePage.passwordDialog.open();
    await profilePage.passwordDialog.close();
    await expect(profilePage.passwordDialog.root).toBeHidden();
  });
});
