import { test, expect } from '@fixtures';
import { createTempAvatar, removeFileIfExists } from '@utils/testData';

test.describe('UI: profile mutations', { tag: ['@ui'] }, () => {
  test('updates personal profile settings', async ({ uniqueProfilePage, testUser }) => {
    const updatedName = `UI Name ${Date.now()}`;

    await test.step('shows immutable account email', async () => {
      await expect(uniqueProfilePage.emailInput).toHaveValue(testUser.email);
      await expect(uniqueProfilePage.emailInput).not.toBeEditable();
    });

    await test.step('updates editable profile fields', async () => {
      await uniqueProfilePage.updatePersonalSettings({
        name: updatedName,
        gender: '1',
        internalAnalyticsConsent: false,
      });
      await expect(uniqueProfilePage.page).toHaveURL(/dashboard\.html/);
    });

    await test.step('reloads profile with saved values', async () => {
      await uniqueProfilePage.goto();
      await expect(uniqueProfilePage.nameInput).toHaveValue(updatedName);
      await expect(uniqueProfilePage.emailInput).toHaveValue(testUser.email);
      await expect(uniqueProfilePage.emailInput).not.toBeEditable();
      await expect(uniqueProfilePage.genderFemaleRadio).toBeChecked();
      await expect(uniqueProfilePage.analyticsConsentCheckbox).not.toBeChecked();
    });
  });

  test('validates and changes password', async ({ uniqueProfilePage }) => {
    await test.step('shows inline error for mismatched passwords', async () => {
      await uniqueProfilePage.changePassword('Password1!', 'Password2!', false);
      await expect(uniqueProfilePage.passwordFormMessage).toBeVisible();
      await expect(uniqueProfilePage.passwordFormMessage).toHaveText(/Пароли не совпадают/);
    });

    await test.step('accepts matching password confirmation', async () => {
      await uniqueProfilePage.changePassword('NewPass!456', 'NewPass!456');
      await expect(uniqueProfilePage.passwordModal).not.toBeVisible();
    });
  });

  test('uploads avatar photo', async ({ uniqueProfilePage }) => {
    const initialAvatarSrc = await uniqueProfilePage.avatarImage.getAttribute('src');
    const tmpFile = createTempAvatar();

    try {
      await uniqueProfilePage.uploadPhoto(tmpFile);
      await expect
        .poll(() => uniqueProfilePage.avatarImage.getAttribute('src'))
        .not.toBe(initialAvatarSrc);
      await expect(uniqueProfilePage.avatarImage).not.toHaveAttribute('src', /placeholder/);
    } finally {
      removeFileIfExists(tmpFile);
    }
  });
});
