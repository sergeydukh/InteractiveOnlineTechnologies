import { Page, Locator } from '@playwright/test';
import { BasePage } from '@pages/BasePage';

export class ProfilePage extends BasePage {
  readonly logoutButton: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly genderMaleRadio: Locator;
  readonly genderFemaleRadio: Locator;
  readonly avatarImage: Locator;
  readonly photoFileInput: Locator;
  readonly replacePhotoButton: Locator;
  readonly removePhotoButton: Locator;
  readonly analyticsConsentCheckbox: Locator;
  readonly openPasswordModalButton: Locator;
  readonly submitButton: Locator;

  readonly passwordModal: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly passwordFormMessage: Locator;
  readonly savePasswordButton: Locator;
  readonly cancelPasswordButton: Locator;
  readonly closePasswordModalButton: Locator;

  constructor(page: Page) {
    super(page);
    this.logoutButton = page.locator('[data-ui="logout-button"]');
    this.nameInput = page.locator('[data-ui="profile-name"]');
    this.emailInput = page.locator('[data-ui="profile-email"]');
    this.genderMaleRadio = page.locator('[data-ui="profile-gender-male"]');
    this.genderFemaleRadio = page.locator('[data-ui="profile-gender-female"]');
    this.avatarImage = page.locator('[data-ui="profile-avatar"]');
    this.photoFileInput = page.locator('[data-ui="profile-photo-input"]');
    this.replacePhotoButton = page.locator('[data-ui="profile-replace-photo-button"]');
    this.removePhotoButton = page.locator('[data-ui="profile-remove-photo-button"]');
    this.analyticsConsentCheckbox = page.locator('[data-ui="profile-analytics-consent"]');
    this.openPasswordModalButton = page.locator('[data-ui="profile-open-password-modal"]');
    this.submitButton = page.locator('[data-ui="profile-submit"]');

    this.passwordModal = page.locator('[data-ui="password-modal"]');
    this.newPasswordInput = page.locator('[data-ui="profile-new-password"]');
    this.confirmPasswordInput = page.locator('[data-ui="profile-confirm-password"]');
    this.passwordFormMessage = page.locator('[data-ui="password-form-message"]');
    this.savePasswordButton = this.passwordModal.getByRole('button', { name: 'Сохранить пароль' });
    this.cancelPasswordButton = page.locator('[data-ui="password-modal-cancel"]');
    this.closePasswordModalButton = page.locator('[data-ui="password-modal-close"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/profile.html');
  }

  async saveProfile(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(r => r.url().includes('/api/profile') && r.request().method() === 'PATCH'),
      this.submitButton.click(),
    ]);
  }

  async updateName(name: string): Promise<void> {
    await this.nameInput.clear();
    await this.nameInput.fill(name);
    await this.saveProfile();
  }

  async updatePersonalSettings(data: {
    name?: string;
    gender?: '0' | '1';
    internalAnalyticsConsent?: boolean;
  }): Promise<void> {
    if (data.name !== undefined) {
      await this.nameInput.clear();
      await this.nameInput.fill(data.name);
    }

    if (data.gender === '0') {
      await this.genderMaleRadio.check();
    }

    if (data.gender === '1') {
      await this.genderFemaleRadio.check();
    }

    if (data.internalAnalyticsConsent !== undefined) {
      await this.analyticsConsentCheckbox.setChecked(data.internalAnalyticsConsent);
    }

    await this.saveProfile();
  }

  async setAnalyticsConsent(checked: boolean): Promise<void> {
    await this.analyticsConsentCheckbox.setChecked(checked);
    await this.saveProfile();
  }

  async openPasswordModal(): Promise<void> {
    if (await this.passwordModal.isVisible()) {
      return;
    }

    await this.openPasswordModalButton.click();
    await this.passwordModal.waitFor({ state: 'visible' });
  }

  async changePassword(newPassword: string, confirmPassword: string, waitForRequest = true): Promise<void> {
    await this.openPasswordModal();
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(confirmPassword);
    if (!waitForRequest) {
      await this.savePasswordButton.click();
      return;
    }
    const responsePromise = this.page.waitForResponse(r =>
      r.url().includes('/api/profile/password') && r.request().method() === 'POST',
    );
    await this.savePasswordButton.click();
    await responsePromise;
  }

  async uploadPhoto(filePath: string): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(r => r.url().includes('/api/profile/photo') && r.request().method() === 'POST'),
      this.photoFileInput.setInputFiles(filePath),
    ]);
  }
}
