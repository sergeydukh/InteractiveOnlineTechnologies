import { test, expect } from '../../fixtures';
import { uniqueEmail } from '@utils/testData';
import { ProfilePage } from '@pages/ProfilePage';

test.describe('UI: registration', { tag: ['@ui'] }, () => {
  test('unique user registers through UI and lands on dashboard', async ({ registerPage, page }) => {
    const user = {
      name: 'UI Register User',
      email: uniqueEmail('ui-register'),
      gender: 'male',
      password: 'TestPass!123',
      analyticsConsent: true,
    } as const;

    await registerPage.register(user);

    await expect(page).toHaveURL(/dashboard\.html/, { timeout: 10000 });

    const profilePage = new ProfilePage(page);
    await profilePage.goto();

    await expect(profilePage.nameInput).toHaveValue(user.name);
    await expect(profilePage.emailInput).toHaveValue(user.email);
    await expect(profilePage.emailInput).not.toBeEditable();
    await expect(profilePage.genderMaleRadio).toBeChecked();
    await expect(profilePage.analyticsConsentCheckbox).toBeChecked();
  });

  test('unchecked analytics consent prevents registration submission', async ({ registerPage, page }) => {
    await registerPage.nameInput.fill('No Consent User');
    await registerPage.emailInput.fill(uniqueEmail('no-consent'));
    await registerPage.passwordInput.fill('TestPass!123');
    await registerPage.submitButton.click();
    const validationMessage = await registerPage.analyticsConsentCheckbox.evaluate(element => {
      if (!(element instanceof HTMLInputElement)) {
        throw new Error('Expected analytics consent control to be a checkbox input');
      }

      return element.validationMessage;
    });
    await expect(page).toHaveURL(/register\.html/);
    expect(validationMessage).toEqual('Please check this box if you want to proceed.');
  });
});
